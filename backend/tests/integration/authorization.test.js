const {
  app, request, pool, resetDatabase, createUserAndLogin, getBalance
} = require('../setup/helpers');
const { USER_ROLES } = require('../../src/config/constants');

describe('Control de acceso por rol', () => {
  beforeEach(resetDatabase);

  const ADMIN_ROUTES = [
    ['get', '/api/admin/users'],
    ['get', '/api/admin/wallets'],
    ['get', '/api/admin/transactions']
  ];

  it.each(ADMIN_ROUTES)('%s %s exige rol ADMIN', async (method, path) => {
    const { token } = await createUserAndLogin({ email: 'user@test.com', rol: USER_ROLES.USER });

    await request(app)[method](path).set('Authorization', `Bearer ${token}`).expect(403);
  });

  it('permite el acceso cuando el rol es ADMIN', async () => {
    const { token } = await createUserAndLogin({
      email: 'admin@test.com',
      rol: USER_ROLES.ADMIN
    });

    for (const [method, path] of ADMIN_ROUTES) {
      await request(app)[method](path).set('Authorization', `Bearer ${token}`).expect(200);
    }
  });

  it('rechaza rutas privadas sin token', async () => {
    const protectedRoutes = [
      ['get', '/api/wallet'],
      ['get', '/api/transactions'],
      ['post', '/api/wallets/deposit'],
      ['post', '/api/wallets/withdraw'],
      ['post', '/api/transfers'],
      ['get', '/api/admin/users']
    ];

    for (const [method, path] of protectedRoutes) {
      await request(app)[method](path).send({ amount: 10 }).expect(401);
    }
  });
});

describe('Aislamiento entre usuarios', () => {
  beforeEach(resetDatabase);

  it('no deja ver una transaccion de otro usuario', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 50000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 50000 });

    const transfer = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ recipientEmail: 'b@test.com', amount: 1000 })
      .expect(200);

    const transactionId = transfer.body.data.transaction.id;

    // The recipient can see it (it is one of its wallets)...
    await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);

    // ...but a third party cannot.
    const c = await createUserAndLogin({ email: 'c@test.com' });
    await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set('Authorization', `Bearer ${c.token}`)
      .expect(403);
  });

  it('el historial solo contiene transacciones propias', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 50000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 50000 });

    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ recipientEmail: 'b@test.com', amount: 1000 })
      .expect(200);

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${b.token}`)
      .expect(200);

    for (const t of res.body.data.transactions) {
      const involvesA =
        t.origen_email === 'a@test.com' || t.destino_email === 'a@test.com';
      const involvesB =
        t.origen_email === 'b@test.com' || t.destino_email === 'b@test.com';
      expect(involvesA && involvesB).toBe(true);
    }
  });
});

describe('Paginacion del historial', () => {
  beforeEach(resetDatabase);

  it('el total corresponde solo a las transacciones del usuario', async () => {
    const a = await createUserAndLogin({ email: 'a@test.com', saldo: 100000 });
    const b = await createUserAndLogin({ email: 'b@test.com', saldo: 100000 });

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/wallets/deposit')
        .set('Authorization', `Bearer ${a.token}`)
        .send({ amount: 1000 })
        .expect(200);
    }

    // One more of B's own, plus a transfer A -> B. The global count is 5;
    // A must only see its own 4.
    await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${b.token}`)
      .send({ amount: 7777 })
      .expect(200);
    await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ recipientEmail: 'b@test.com', amount: 1000 })
      .expect(200);

    const res = await request(app)
      .get('/api/transactions?page=1&limit=2')
      .set('Authorization', `Bearer ${a.token}`)
      .expect(200);

    // 3 deposits + 1 transfer from A = 4, not the global total of 5.
    expect(res.body.data.pagination.total).toBe(4);
    expect(res.body.data.pagination.totalPages).toBe(2);
    expect(res.body.data.transactions).toHaveLength(2);
  });

  it('aplica el filtro por tipo', async () => {
    const { token } = await createUserAndLogin({ email: 'a@test.com', saldo: 100000 });

    await request(app).post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${token}`).send({ amount: 1000 }).expect(200);
    await request(app).post('/api/wallets/withdraw')
      .set('Authorization', `Bearer ${token}`).send({ amount: 500 }).expect(200);

    const res = await request(app)
      .get('/api/transactions?tipo=WITHDRAW')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.transactions).toHaveLength(1);
    expect(res.body.data.transactions[0].tipo).toBe('WITHDRAW');
  });
});

describe('Administracion de usuarios', () => {
  beforeEach(resetDatabase);

  it('bloquea un usuario y su billetera', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });
    const victim = await createUserAndLogin({ email: 'victima@test.com', saldo: 10000 });

    await request(app)
      .patch(`/api/admin/users/${victim.user.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const { rows } = await pool.query('SELECT estado FROM billeteras WHERE id = $1', [victim.wallet.id]);
    expect(rows[0].estado).toBe('BLOCKED');

    // A blocked user can no longer operate.
    await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${victim.token}`)
      .send({ amount: 100 })
      .expect(403);
  });

  it('impide que el admin se bloque a si mismo', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });

    await request(app)
      .patch(`/api/admin/users/${admin.user.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);
  });

  it('desbloquea y reactiva la billetera', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });
    const victim = await createUserAndLogin({ email: 'victima@test.com', saldo: 10000 });

    await request(app).patch(`/api/admin/users/${victim.user.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`).expect(200);
    await request(app).patch(`/api/admin/users/${victim.user.id}/unblock`)
      .set('Authorization', `Bearer ${admin.token}`).expect(200);

    expect(await getBalance(victim.wallet.id)).toBe(10000);
    await request(app)
      .post('/api/wallets/deposit')
      .set('Authorization', `Bearer ${victim.token}`)
      .send({ amount: 100 })
      .expect(200);
  });
});

describe('Validez del token frente a cambios en la cuenta', () => {
  beforeEach(resetDatabase);

  it('un token emitido antes del bloqueo deja de servir de inmediato', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });
    const victim = await createUserAndLogin({ email: 'victima@test.com', saldo: 10000 });

    await request(app)
      .patch(`/api/admin/users/${victim.user.id}/block`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    // Ni siquiera las rutas de solo lectura aceptan el token anterior.
    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${victim.token}`)
      .expect(403);
    expect(res.body.error).toBe('USER_BLOCKED');
  });

  it('el rol se toma de la base de datos, no del token', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });

    await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [USER_ROLES.USER, admin.user.id]);

    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(403);
  });

  it('un token de un usuario que ya no existe responde 401', async () => {
    const { token, user } = await createUserAndLogin({ email: 'borrado@test.com' });

    await pool.query('DELETE FROM usuarios WHERE id = $1', [user.id]);

    await request(app)
      .get('/api/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });
});

describe('Validacion del parametro :id', () => {
  beforeEach(resetDatabase);

  it.each(['abc', '0', '-1', '1.5', '99999999999'])(
    'GET /api/transactions/%s responde 422 en vez de 500',
    async (id) => {
      const { token } = await createUserAndLogin({ email: 'u1@test.com' });

      const res = await request(app)
        .get(`/api/transactions/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    }
  );

  it('PATCH /api/admin/users/abc/block responde 422', async () => {
    const admin = await createUserAndLogin({ email: 'admin@test.com', rol: USER_ROLES.ADMIN });

    await request(app)
      .patch('/api/admin/users/abc/block')
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(422);
  });
});

describe('GET /health', () => {
  it('confirma que la base de datos responde', async () => {
    const res = await request(app).get('/health').expect(200);

    expect(res.body.status).toBe('OK');
    expect(res.body.database).toBe('OK');
  });
});
