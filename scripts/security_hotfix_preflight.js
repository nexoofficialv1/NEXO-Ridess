const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
const env=fs.readFileSync(path.join(root,'.env.example'),'utf8');
const checks=[
  ['version', server.includes('SPRINT7Z_SECURITY_HOTFIX_RC2')],
  ['login_guard', server.includes("authRateCheck(db, req, 'PASSWORD_LOGIN'") && server.includes("recordAuthAttempt(db, req, 'PASSWORD_LOGIN'")],
  ['otp_guard', server.includes("authRateCheck(db, req, 'OTP_VERIFY'") && server.includes("recordAuthAttempt(db, req, 'OTP_VERIFY'")],
  ['route_fix', server.includes("rel.startsWith('/red-team/')") && !server.includes("rel.startsWith('/red-team/','/release-candidate/'")],
  ['security_headers', server.includes('Content-Security-Policy') && server.includes('Strict-Transport-Security')],
  ['env_no_real_pii', !env.includes('6295192839') && !env.includes('bappa.roysm@gmail.com') && !env.includes('admin@123')],
  ['web_page', fs.existsSync(path.join(root,'web','security-hotfix','index.html'))]
];
let ok=true; for(const [k,v] of checks){ console.log((v?'PASS':'FAIL')+' '+k); if(!v) ok=false; }
if(!ok) process.exit(1);
