const fs = require('fs');
const path = require('path');

const cliDir = path.resolve(__dirname, '..', 'cli');

if (!fs.existsSync(cliDir)) {
  console.log('[build:cli] cli directory not present; skipping CLI packaging.');
  process.exit(0);
}

console.log('[build:cli] cli directory detected; no packaging implementation is present in this checkout.');
