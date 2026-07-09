#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
const pkg = JSON.parse(read('package.json'));
const server = read('server.js');
const app = read('web/app/app.js');
const sw = read('web/app/sw.js');
const checks = [
  ['package sprint8j name', /sprint8j-market-stable|sprint8k-production-deploy-apk-build-pack/.test(pkg.name)],
  ['package s8j check script', !!pkg.scripts['s8j:check']],
  ['package s8k check script', !!pkg.scripts['s8k:check']],
  ['server version Sprint-8J', /SPRINT8J_MARKET_STABLE_BUILD/.test(server)],
  ['app version Sprint-8J', /SPRINT8J_MARKET_STABLE_BUILD/.test(app)],
  ['market readiness API', /sprint8j-market-readiness/.test(server)],
  ['demo login not always visible', /showDemoLoginButton\(\)/.test(app) && !/<button class="switch-link" onclick="demoLogin\(\)">\$\{L\('demo'\)\}<\/button><p/.test(app)],
  ['postgres migration present', fs.existsSync(path.join(root,'scripts','postgres_migrate_sprint8c.js')) && fs.existsSync(path.join(root,'docs','SPRINT8C_POSTGRES_MIGRATION.sql'))],
  ['service worker cache sprint8j', /sprint8j-market-stable/.test(sw)]
];
const failed = checks.filter(([,ok])=>!ok);
console.log('NEXO Sprint-8J Market Build Preflight');
for(const [name,ok] of checks) console.log(`${ok?'✅':'❌'} ${name}`);
if(failed.length){
  console.error(`\nBlocked: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nMarket stable package is ready for Termux push, DB migration, server deploy and APK build.');
