#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const gradle = fs.existsSync(path.join(root,'apk','app','build.gradle')) ? fs.readFileSync(path.join(root,'apk','app','build.gradle'),'utf8') : '';
const checks = [
  {key:'package_sprint', ok:String(pkg.version||'').includes('sprint7t') || String(pkg.version||'').includes('sprint7u'), detail:pkg.version},
  {key:'apk_version', ok:(gradle.includes("versionName '2.0.7T'") && gradle.includes('versionCode 88')) || (gradle.includes("versionName '2.0.7U'") && gradle.includes('versionCode 89')), detail:'2.0.7T/88 or 2.0.7U/89'},
  {key:'no_live_data_in_package', ok:!fs.existsSync(path.join(root,'data','nexo_ride_db.json')), detail:'data/nexo_ride_db.json must not be shipped'},
  {key:'pilot_page', ok:fs.existsSync(path.join(root,'web','pilot-launch','index.html')), detail:'/pilot-launch/'},
  {key:'pilot_scripts', ok:fs.existsSync(path.join(root,'scripts','pilot_launch_preflight.js')), detail:'scripts/pilot_launch_preflight.js'}
];
const blockers=checks.filter(c=>!c.ok);
console.log(JSON.stringify({ok:blockers.length===0, sprint:'7U', stage:blockers.length?'BLOCKED':'READY_FOR_PILOT_PACKAGE', checks, blockers}, null, 2));
if(blockers.length) process.exit(1);
