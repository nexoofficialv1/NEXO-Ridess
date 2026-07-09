const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const pages=['final-cleanup','red-team','deploy-commands','env-freeze','release-candidate','rc-issues','rc-deploy','security-hotfix'];
const missing=pages.filter(p=>!fs.existsSync(path.join(root,'web',p,'index.html')));
const hooks=['finalSmokeTest','redTeamSecurityReadiness','environmentFreezeReport','productionDeployCommandPack','securityHotfixReadiness','ensureSprint7ZFoundation'];
const missingHooks=hooks.filter(h=>!server.includes(h));
if(missing.length||missingHooks.length){console.error(JSON.stringify({ok:false,missing,missingHooks},null,2)); process.exit(1);}
console.log(JSON.stringify({ok:true,sprint:'7Z_RC2',pages,hooks,api:['/api/platform/final-smoke-test','/api/platform/security-hotfix-readiness']},null,2));
