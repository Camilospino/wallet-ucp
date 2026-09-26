const { validateRegister, validateLogin } = require('../src/validators/authValidator');

describe('Authentication Validators', () => {
  describe('validateRegister', () => {
    it('should validate correct registration data', () => {
      const data = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        password: 'Password123!',
        telefono: '+1234567890'
      };

      const result = validateRegister(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short name', () => {
      const data = {
        nombre: 'J',
        apellido: 'Pérez',
        email: 'juan@example.com',
        password: 'Password123!'
      };

      const result = validateRegister(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Nombre debe tener al menos 2 caracteres');
    });

    it('should reject invalid email', () => {
      const data = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'invalid-email',
        password: 'Password123!'
      };

      const result = validateRegister(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email inválido');
    });

    it('should reject weak password', () => {
      const data = {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan@example.com',
        password: '123'
      };

      const result = validateRegister(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contraseña debe tener al menos 8 caracteres');
    });
  });

  describe('validateLogin', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'juan@example.com',
        password: 'Password123!'
      };

      const result = validateLogin(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'Password123!'
      };

      const result = validateLogin(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email inválido');
    });

    it('should reject missing password', () => {
      const data = {
        email: 'juan@example.com'
      };

      const result = validateLogin(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contraseña requerida');
    });
  });
});
