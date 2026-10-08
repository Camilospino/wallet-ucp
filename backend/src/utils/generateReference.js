const { randomInt } = require('crypto');

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SUFFIX_LENGTH = 6;

/**
 * Builds a reference such as TX-20260108-K3F9QZ.
 *
 * The suffix comes from the CSPRNG instead of Math.random(), so references are
 * not predictable and collisions on the UNIQUE `referencia` column stay
 * negligible (36^6 ≈ 2.2 billion combinations per day).
 */
const generateTransactionReference = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }

  return `TX-${dateStr}-${suffix}`;
};

module.exports = {
  generateTransactionReference
};
