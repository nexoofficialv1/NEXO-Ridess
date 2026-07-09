#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const required=['web/ux-polish/index.html','web/distribution-pack/index.html','web/app/app.js','server.js','package.json','apk/app/build.gradle'];
let ok=true; for(const f of required){ if(!fs.existsSync(path.join(root,f))){ console.error('MISSING',f); ok=false; } }
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
for(const n of ['ensureSprint7UFoundation','/api/platform/ux-distribution-readiness','/api/public/language-pack','UX_DISTRIBUTION_VIEW']){ if(!server.includes(n)){ console.error('SERVER_MISSING',n); ok=false; } }
const gradle=fs.readFileSync(path.join(root,'apk','app','build.gradle'),'utf8');
if(!gradle.includes("versionName '2.0.7U'")){ console.error('APK_VERSION_NOT_7U'); ok=false; }
console.log(ok?'Sprint-7U UX/distribution preflight OK':'Sprint-7U UX/distribution preflight FAILED'); process.exit(ok?0:1);
