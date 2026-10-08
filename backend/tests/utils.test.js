const { roundMoney } = require('../src/utils/money');
const { generateTransactionReference } = require('../src/utils/generateReference');

describe('roundMoney', () => {
  it('elimina el error de coma flotante al sumar', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });

  it('redondea a centavos', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(1000.004)).toBe(1000);
  });

  it('acepta strings numéricos', () => {
    expect(roundMoney('25.50')).toBe(25.5);
  });
});

describe('generateTransactionReference', () => {
  it('no repite referencias en un lote grande', () => {
    const refs = new Set(Array.from({ length: 5000 }, generateTransactionReference));
    expect(refs.size).toBe(5000);
  });
});
