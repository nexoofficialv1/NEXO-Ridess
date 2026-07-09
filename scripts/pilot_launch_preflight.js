#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const checks = [
  ['server.js', fs.existsSync(path.join(root,'server.js'))],
  ['pilot launch page', fs.existsSync(path.join(root,'web','pilot-launch','index.html'))],
  ['field test page', fs.existsSync(path.join(root,'web','field-test','index.html'))],
  ['release page', fs.existsSync(path.join(root,'web','release','index.html'))],
  ['APK gradle', fs.existsSync(path.join(root,'apk','app','build.gradle'))],
  ['GitHub APK workflow', fs.existsSync(path.join(root,'.github','workflows','android-apk.yml'))]
];
const bad = checks.filter(x=>!x[1]);
console.log(JSON.stringify({ok: bad.length===0, sprint:'7U', checks: checks.map(([title,ok])=>({title,ok})), blockers: bad.map(x=>x[0])}, null, 2));
if(bad.length) process.exit(1);
