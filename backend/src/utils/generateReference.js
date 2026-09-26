const generateTransactionReference = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TX-${dateStr}-${randomStr}`;
};

module.exports = {
  generateTransactionReference
};
