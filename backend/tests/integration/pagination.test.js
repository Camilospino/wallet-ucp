const { parsePagination, validatePagination, MAX_LIMIT } = require('../../src/validators/paginationValidator');
const { app, request, resetDatabase, createUserAndLogin } = require('../setup/helpers');
const { USER_ROLES } = require('../../src/config/constants');

describe('Validador de paginación', () => {
  it('aplica valores por defecto cuando no hay parámetros', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 50, offset: 0 });
  });

  it('calcula el offset correctamente', () => {
    expect(parsePagination({ page: '3', limit: '10' })).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it('limita el tamaño de página para no cargar toda la tabla', () => {
    expect(parsePagination({ limit: '999999' }).limit).toBe(MAX_LIMIT);
  });

  it('rechaza page y limit no numéricos o fuera de rango', () => {
    expect(validatePagination({ page: '-1' }).isValid).toBe(false);
    expect(validatePagination({ limit: '0' }).isValid).toBe(false);
    expect(validatePagination({ page: 'abc' }).isValid).toBe(false);
    expect(validatePagination({ limit: '999999' }).isValid).toBe(false);
  });

  it('acepta parámetros válidos', () => {
    expect(validatePagination({ page: '1', limit: '10' }).isValid).toBe(true);
  });
});

describe('Paginación en las rutas de administración', () => {
  beforeEach(resetDatabase);

  const asAdmin = async () => {
    const { token } = await createUserAndLogin({
      email: 'admin@test.com',
      rol: USER_ROLES.ADMIN
    });
    return { Authorization: `Bearer ${token}` };
  };

  it('devuelve solo la página solicitada', async () => {
    const headers = await asAdmin();
    for (let i = 0; i < 12; i++) {
      await createUserAndLogin({ email: `user${i}@test.com` });
    }

    const first = await request(app)
      .get('/api/admin/users?page=1&limit=5')
      .set(headers)
      .expect(200);

    const second = await request(app)
      .get('/api/admin/users?page=2&limit=5')
      .set(headers)
      .expect(200);

    expect(first.body.data.users).toHaveLength(5);
    expect(second.body.data.users).toHaveLength(5);
    expect(first.body.data.pagination.total).toBe(13);
    expect(first.body.data.pagination.totalPages).toBe(3);

    const firstIds = first.body.data.users.map((u) => u.id);
    const secondIds = second.body.data.users.map((u) => u.id);
    expect(firstIds.filter((id) => secondIds.includes(id))).toHaveLength(0);
  });

  it('rechaza limit excessive con 422', async () => {
    const headers = await asAdmin();

    const res = await request(app)
      .get('/api/admin/users?limit=999999')
      .set(headers)
      .expect(422);

    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('rechaza page inválida con 422', async () => {
    const headers = await asAdmin();

    await request(app)
      .get('/api/admin/users?page=-5')
      .set(headers)
      .expect(422);
  });
});
