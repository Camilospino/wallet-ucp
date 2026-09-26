const {
  app, request, resetDatabase, createUser, createUserAndLogin
} = require('../setup/helpers');

describe('GET /api/users/lookup', () => {
  beforeEach(async () => {
    await resetDatabase();
    await createUser({
      nombre: 'María',
      apellido: 'García',
      email: 'maria@example.com'
    });
  });

  it('devuelve solo el nombre del destinatario', async () => {
    const { token } = await createUserAndLogin({
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@example.com'
    });

    const res = await request(app)
      .get('/api/users/lookup?email=maria@example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.nombre).toBe('María García');
  });

  it('no expone datos sensibles del usuario buscado', async () => {
    const { token } = await createUserAndLogin({ email: 'juan@example.com' });

    const res = await request(app)
      .get('/api/users/lookup?email=maria@example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const data = res.body.data;
    expect(Object.keys(data).sort()).toEqual(['inicial', 'nombre']);
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('rol');
    expect(data).not.toHaveProperty('estado');
    expect(data).not.toHaveProperty('password_hash');
  });

  it('encuentra el usuario sin importar mayusculas', async () => {
    const { token } = await createUserAndLogin({ email: 'juan@example.com' });

    const res = await request(app)
      .get('/api/users/lookup?email=MARIA@EXAMPLE.COM')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.nombre).toBe('María García');
  });

  it('devuelve 404 si el email no existe', async () => {
    const { token } = await createUserAndLogin({ email: 'juan@example.com' });

    const res = await request(app)
      .get('/api/users/lookup?email=nadie@example.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(res.body.error).toBe('USER_NOT_FOUND');
  });

  it('devuelve 422 para un email mal formado', async () => {
    const { token } = await createUserAndLogin({ email: 'juan@example.com' });

    await request(app)
      .get('/api/users/lookup?email=no-es-email')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);
  });

  it('exige autenticacion', async () => {
    await request(app)
      .get('/api/users/lookup?email=maria@example.com')
      .expect(401);
  });
});
