#!/usr/bin/env node
/**
 * OIOS Studio — Production Start Script
 * Cross-platform. Reads PORT env variable (Railway injects this) or defaults to 3000.
 */

const { spawn } = require('child_process');
const path = require('path');

const port = process.env.PORT || 3000;
const isWin = process.platform === 'win32';

// On Windows: use shell + .cmd shim. On Linux/Mac (Railway): direct binary, no shell.
const serveBin = isWin
  ? path.join(__dirname, 'node_modules', '.bin', 'serve.cmd')
  : path.join(__dirname, 'node_modules', '.bin', 'serve');

console.log(`Starting OIOS Studio on port ${port}...`);

const child = spawn(serveBin, ['.', '--listen', String(port), '--single'], {
  stdio: 'inherit',
  shell: isWin
});

child.on('error', (err) => {
  console.error('Failed to start serve:', err.message);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
