#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const required=['server.js','web/security-deploy/index.html','web/rollback/index.html','web/maintenance/index.html','apk/app/build.gradle','package.json'];
let ok=true; for(const f of required){ if(!fs.existsSync(path.join(root,f))){ console.error('MISSING',f); ok=false; } }
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
for(const n of ['ensureSprint7VFoundation','/api/platform/security-deploy-readiness','/api/platform/launch-release-lock','/api/admin/maintenance-mode','maintenanceBlock']){ if(!server.includes(n)){ console.error('SERVER_MISSING',n); ok=false; } }
const gradle=fs.readFileSync(path.join(root,'apk','app','build.gradle'),'utf8');
if(!gradle.includes("versionName '2.0.7V'")){ console.error('APK_VERSION_NOT_7V'); ok=false; }
console.log(ok?'Sprint-7V security/deploy/rollback preflight OK':'Sprint-7V security/deploy/rollback preflight FAILED'); process.exit(ok?0:1);
