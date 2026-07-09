#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mustExist = [
  'server.js',
  'package.json',
  'web/app/app.js',
  'web/app/sw.js',
  'scripts/postgres_migrate_sprint8c.js',
  'docs/SPRINT8C_POSTGRES_MIGRATION.sql'
];
const missing = mustExist.filter((p) => !fs.existsSync(path.join(root, p)));
console.log('NEXO Ride Sprint-8K Production Deploy Pack Check');
console.log('---------------------------------------------------');
if (missing.length) {
  console.error('Missing required files:');
  missing.forEach((m) => console.error(' - ' + m));
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const requiredScripts = ['check','market:preflight','db:migrate:production','s8k:check','final:smoke'];
const missingScripts = requiredScripts.filter((k) => !pkg.scripts || !pkg.scripts[k]);
if (missingScripts.length) {
  console.error('Missing package scripts: ' + missingScripts.join(', '));
  process.exit(1);
}
const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const envKeys = ['DATABASE_URL','JWT_SECRET'];
const absentEnv = envKeys.filter((k) => !envExample.includes(k));
if (absentEnv.length) {
  console.error('.env.example missing keys: ' + absentEnv.join(', '));
  process.exit(1);
}
console.log('OK: Server files present');
console.log('OK: PostgreSQL migration script present');
console.log('OK: Market preflight script present');
console.log('OK: Sprint-8K package scripts present');
console.log('OK: Ready for Termux push -> DB migration -> server deploy -> APK build');
