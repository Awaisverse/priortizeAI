#!/usr/bin/env node
// Cross-platform Stop hook — runs after every Claude Code session.
// Uses Node.js so it works on both macOS and Windows without shell differences.

const { execSync } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '../..');

console.log('\n=== Post-session type check ===');

try {
  execSync('npm run type-check', {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  console.log('TypeScript  ✓  0 errors');
} catch (err) {
  const raw = (err.stderr || err.stdout || Buffer.alloc(0)).toString();
  const errorLines = raw
    .split('\n')
    .filter((l) => l.includes('error TS'))
    .slice(0, 8);
  console.log(`TypeScript  ✗  ${errorLines.length} error(s) found:`);
  errorLines.forEach((l) => console.log('  ', l.trim()));
}

console.log('================================\n');
