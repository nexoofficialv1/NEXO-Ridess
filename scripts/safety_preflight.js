const fs=require('fs');
const path=require('path');
const required=['server.js','web/admin-safety/index.html','web/track/index.html'];
const missing=required.filter(p=>!fs.existsSync(path.join(__dirname,'..',p)));
if(missing.length){console.error('Sprint-7P safety preflight missing:', missing.join(', ')); process.exit(1);}
const s=fs.readFileSync(path.join(__dirname,'..','server.js'),'utf8');
for(const marker of ['S7P_SAFETY_SOS_TRIP_SHARING','/api/platform/safety-readiness','/api/admin/safety-dashboard','/api/track/']){ if(!s.includes(marker)){ console.error('Missing marker', marker); process.exit(1); }}
console.log('Sprint-7P Safety preflight OK');
