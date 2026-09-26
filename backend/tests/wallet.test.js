const { validateDeposit, validateWithdraw, validateTransfer } = require('../src/validators/walletValidator');

describe('Wallet Validators', () => {
  describe('validateDeposit', () => {
    it('should validate correct deposit amount', () => {
      const data = { amount: 100000 };
      const result = validateDeposit(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amount', () => {
      const data = { amount: -100 };
      const result = validateDeposit(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto debe ser mayor a 0');
    });

    it('should reject zero amount', () => {
      const data = { amount: 0 };
      const result = validateDeposit(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto debe ser mayor a 0');
    });

    it('should reject non-numeric amount', () => {
      const data = { amount: 'invalid' };
      const result = validateDeposit(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto es requerido y debe ser numérico');
    });

    it('should reject amount exceeding maximum', () => {
      const data = { amount: 1000000000000 };
      const result = validateDeposit(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto excede el máximo permitido');
    });
  });

  describe('validateWithdraw', () => {
    it('should validate correct withdraw amount', () => {
      const data = { amount: 50000 };
      const result = validateWithdraw(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative amount', () => {
      const data = { amount: -100 };
      const result = validateWithdraw(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto debe ser mayor a 0');
    });

    it('should reject zero amount', () => {
      const data = { amount: 0 };
      const result = validateWithdraw(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto debe ser mayor a 0');
    });
  });

  describe('validateTransfer', () => {
    it('should validate correct transfer data', () => {
      const data = {
        recipientEmail: 'recipient@example.com',
        amount: 25000
      };
      const result = validateTransfer(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid recipient email', () => {
      const data = {
        recipientEmail: 'invalid-email',
        amount: 25000
      };
      const result = validateTransfer(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email del destinatario inválido');
    });

    it('should reject negative amount', () => {
      const data = {
        recipientEmail: 'recipient@example.com',
        amount: -100
      };
      const result = validateTransfer(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monto debe ser mayor a 0');
    });

    it('should reject missing recipient email', () => {
      const data = {
        amount: 25000
      };
      const result = validateTransfer(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Email del destinatario inválido');
    });
  });
});
