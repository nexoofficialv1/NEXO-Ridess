const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const dataDir=process.env.DATA_DIR || path.join(root,'data');
const dbFile=path.join(dataDir,'nexo_ride_db.json');
const envFile=path.join(root,'.env');
const prodEnv=path.join(dataDir,'production.env');
function exists(p){try{return fs.existsSync(p)}catch(e){return false}}
const checks=[
  {key:'server_js',ok:exists(path.join(root,'server.js')),detail:'server.js present'},
  {key:'package_json',ok:exists(path.join(root,'package.json')),detail:'package.json present'},
  {key:'data_dir',ok:exists(dataDir),detail:dataDir},
  {key:'db_file',ok:exists(dbFile),detail:dbFile},
  {key:'env_file',ok:exists(envFile)||exists(prodEnv),detail:'Do not overwrite existing .env / data/production.env during deploy'},
  {key:'no_zip_data_overwrite',ok:true,detail:'Sprint ZIP intentionally should not contain live data/nexo_ride_db.json'},
  {key:'database_url_for_5k',ok:!!process.env.DATABASE_URL,detail:process.env.DATABASE_URL?'DATABASE_URL configured':'JSON fallback only; PostgreSQL required before 5k/10k production'},
  {key:'redis_url_for_live',ok:!!process.env.REDIS_URL,detail:process.env.REDIS_URL?'REDIS_URL configured':'Redis required before 1000+ active drivers'},
  {key:'real_otp',ok:String(process.env.OTP_PROVIDER||'DEMO').toUpperCase()!=='DEMO',detail:'Configure Firebase/MSG91/2Factor before public launch'},
  {key:'real_payment',ok:String(process.env.PAYMENT_PROVIDER||'DEMO').toUpperCase()!=='DEMO',detail:'Configure Razorpay/manual verified payment before public launch'},
];
const score=Math.round(checks.filter(c=>c.ok).length/checks.length*100);
const hardOk=checks.find(c=>c.key==='server_js').ok && checks.find(c=>c.key==='package_json').ok;
console.log(JSON.stringify({ok:hardOk, sprint:'7I', score_percent:score, checks, warning:'Low score means production env is not fully configured yet; it should not block local syntax checks.', deploy_rules:['Backup live data first','Do not overwrite .env','Do not overwrite data/','Restart server','Check /api/health and /api/platform/production-readiness']},null,2));
if(!hardOk) process.exitCode=1;
