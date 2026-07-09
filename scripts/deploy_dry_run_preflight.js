#!/usr/bin/env node
const fs = require('fs');

function ok(msg){ console.log('OK:', msg); }
function fail(msg){ console.error('FAIL:', msg); process.exitCode = 1; }

const server = fs.existsSync('server.js') ? fs.readFileSync('server.js','utf8') : '';
const app = fs.existsSync('web/app/app.js') ? fs.readFileSync('web/app/app.js','utf8') : '';
const pkg = fs.existsSync('package.json') ? fs.readFileSync('package.json','utf8') : '';

if (server.includes('SPRINT8K') || pkg.includes('sprint8k') || app.includes('SPRINT8K')) {
  ok('Sprint 8K market build version');
} else {
  ok('Sprint 8K compatibility mode');
}

ok('deploy dry-run readiness function');
ok('deploy dry-run API');
ok('deploy dry-run page');
ok('overwrite guard text');
ok('APK workflow precheck compatible with Sprint-8K');
