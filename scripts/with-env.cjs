const { readFileSync } = require('fs');
const { spawn } = require('child_process');
const { resolve } = require('path');

const root = resolve(__dirname, '..');
const text = readFileSync(resolve(root, '.env'), 'utf8');
for (const line of text.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq < 1) continue;
  const key = trimmed.slice(0, eq);
  if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1);
}

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const child = spawn(args[0], args.slice(1), { stdio: 'inherit', env: process.env, shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
