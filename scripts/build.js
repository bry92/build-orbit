const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(command, args, cwd) {
  const executable = process.platform === 'win32' && ['npm', 'npx'].includes(command) ? `${command}.cmd` : command;
  const result = spawnSync(executable, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const root = path.resolve(__dirname, '..');
const frontendDir = path.join(root, 'buildorbit-frontend');

if (process.env.DATABASE_URL) {
  run('node', ['migrate.js'], root);
} else {
  console.log('[build] DATABASE_URL not set; skipping migrations.');
}

if (fs.existsSync(frontendDir)) {
  run('npm', ['install', '--include=dev'], frontendDir);
  run('npm', ['run', 'build'], frontendDir);
} else {
  console.log('[build] buildorbit-frontend not present; skipping frontend build.');
}

run('node', [path.join('scripts', 'build-cli.js')], root);
