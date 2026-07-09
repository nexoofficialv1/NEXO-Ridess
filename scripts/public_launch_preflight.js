
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname,'..');
const required = [
  'web/public-launch/index.html',
  'web/driver-onboarding/index.html',
  'web/passenger-help/index.html',
  'web/qr-kit/index.html',
  'web/support-center/index.html',
  'server.js',
  'package.json'
];
let ok = true;
for (const f of required){
  const p = path.join(root,f);
  if(!fs.existsSync(p)){ console.error('MISSING', f); ok=false; }
}
const server = fs.readFileSync(path.join(root,'server.js'),'utf8');
for (const needle of ['/api/platform/public-launch-readiness','/api/public/launch-kit','ensureSprint7TFoundation','PUBLIC_LAUNCH_MANAGE']){
  if(!server.includes(needle)){ console.error('SERVER_MISSING', needle); ok=false; }
}
if(!server.includes('2.0-SPRINT7T_PUBLIC_LAUNCH_ONBOARDING_KIT') && !server.includes('2.0-SPRINT7U_BENGALI_ENGLISH_UX_DISTRIBUTION')){ console.error('VERSION_NOT_7T_OR_NEWER'); ok=false; }
console.log(ok ? 'Sprint-7T/7U public launch preflight OK' : 'Sprint-7T/7U public launch preflight FAILED');
process.exit(ok ? 0 : 1);
