#!/usr/bin/env node
/**
 * OIOS Studio — Production Start Script
 * Reads PORT env variable (set by Railway) or defaults to 3000.
 * Runs serve as a static file server.
 */

const { execSync } = require('child_process');

const port = process.env.PORT || 3000;
const cmd = `node node_modules/serve/build/main.js . -l ${port} --single`;

console.log(`Starting OIOS Studio on port ${port}...`);
execSync(cmd, { stdio: 'inherit' });
