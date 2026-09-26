const {
  app, request, pool, resetDatabase, createUser, createUserAndLogin
} = require('../setup/helpers');
const { USER_ROLES, USER_STATES } = require('../../src/config/constants');

const VALID_USER = {
  nombre: 'Juan',
  apellido: 'Pérez',
  email: 'juan@example.com',
  password: 'Password123!'
};

const walletIdOfUser = async (userId) => {
  const { rows } = await pool.query('SELECT id FROM billeteras WHERE usuario_id = $1', [userId]);
  return rows[0].id;
};

describe('POST /api/auth/register', () => {
  beforeEach(resetDatabase);

  it('crea el usuario y devuelve 201', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('juan@example.com');
    expect(res.body.data.user.rol).toBe(USER_ROLES.USER);
  });

  it('nunca devuelve el password_hash', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);

    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('crea la billetera automaticamente con saldo 0', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_USER).expect(201);
    const walletId = await walletIdOfUser(res.body.data.user.id);

    const { rows } = await pool.query('SELECT saldo FROM billeteras WHERE id = $1', [walletId]);
    expect(parseFloat(rows[0].saldo)).toBe(0);
  });

  it('rechaza email duplicado con 409 (ignora mayusculas)', async () => {
    await request(app).post('/api/auth/register').send(VALID_USER).expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_USER, email: 'JUAN@EXAMPLE.COM' })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('rechaza datos invalidos con 422', async () => {
    const invalid = [
      { ...VALID_USER, nombre: 'J' },
      { ...VALID_USER, email: 'no-es-email' },
      { ...VALID_USER, password: '123' }
    ];

    for (const body of invalid) {
      const res = await request(app).post('/api/auth/register').send(body).expect(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    }
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(resetDatabase);

  it('devuelve token y usuario con credenciales correctas', async () => {
    await createUser({ email: 'user@example.com', password: 'User123!' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'User123!' })
      .expect(200);

    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe('user@example.com');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('acepta el email en cualquier capitalizacion', async () => {
    await createUser({ email: 'user@example.com', password: 'User123!' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'USER@EXAMPLE.COM', password: 'User123!' })
      .expect(200);

    expect(res.body.data.user.email).toBe('user@example.com');
  });

  it('rechaza password incorrecta con 401', async () => {
    await createUser({ email: 'user@example.com', password: 'User123!' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'incorrecta' })
      .expect(401);

    expect(res.body.error).toBe('AUTHENTICATION_ERROR');
  });

  it('rechaza usuario inexistente con 401', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@example.com', password: 'User123!' })
      .expect(401);
  });

  it('rechaza usuario bloqueado con 403', async () => {
    const { user } = await createUser({ email: 'bloqueado@example.com' });
    await pool.query('UPDATE usuarios SET estado = $1 WHERE id = $2', [USER_STATES.BLOCKED, user.id]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bloqueado@example.com', password: 'Test123!' })
      .expect(403);

    expect(res.body.error).toBe('USER_BLOCKED');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(resetDatabase);

  it('devuelve el perfil del usuario autenticado', async () => {
    const { token } = await createUserAndLogin({ email: 'user@example.com' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.user.email).toBe('user@example.com');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('rechaza sin token con 401', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('rechaza token invalido con 401', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token.invalido')
      .expect(401);
  });
});
