/**
 * Run all unit tests in tests/unit/*.js sequentially.
 * Exits 1 if any test file fails.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const unitDir = path.join(__dirname, '..', 'tests', 'unit');
const files = fs.readdirSync(unitDir)
  .filter((f) => f.endsWith('.js') && f.startsWith('test-'))
  .sort();

if (files.length === 0) {
  console.error('[test] No unit test files found');
  process.exit(1);
}

let failed = 0;

for (const file of files) {
  const filePath = path.join(unitDir, file);
  console.log(`\n── ${file} ──`);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'test' },
  });
  if (result.status !== 0) failed++;
}

console.log(`\n[test] ${files.length - failed}/${files.length} files passed`);
process.exit(failed > 0 ? 1 : 0);
