/**
 * Rounds a monetary value to cents.
 *
 * Balances are NUMERIC(15,2) in PostgreSQL but are added and subtracted in JS,
 * where 0.1 + 0.2 === 0.30000000000000004. The database rounds on write, but
 * the value echoed back in the response would not, so every computed balance
 * goes through here to keep the API and the database in agreement.
 */
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

module.exports = { roundMoney };
