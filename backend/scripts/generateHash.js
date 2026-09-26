const bcrypt = require('bcryptjs');

const passwords = ['Admin123!', 'User123!'];

// Sequential loop (not forEach) so the output is deterministic and readable.
const main = async () => {
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('---');
  }
};

main().catch((error) => {
  console.error('Error generating hashes:', error);
  process.exit(1);
});
