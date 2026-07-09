const fs=require('fs'); const path=require('path'); const dataDir=process.env.DATA_DIR||path.join(__dirname,'..','data'); const dbFile=path.join(dataDir,'nexo_ride_db.json');
let db={}; try{ if(fs.existsSync(dbFile)) db=JSON.parse(fs.readFileSync(dbFile,'utf8')); }catch(e){ console.error('DB parse failed:',e.message); process.exit(1); }
const checks=[
  ['fare_rules', !!db.fare_rules || !fs.existsSync(dbFile)],
  ['commission_rules_ready', Array.isArray(db.commission_rules) || !fs.existsSync(dbFile)],
  ['driver_wallets_ready', Array.isArray(db.driver_wallets) || !fs.existsSync(dbFile)],
  ['settlements_ready', Array.isArray(db.settlements) || !fs.existsSync(dbFile)],
  ['receipts_ready', Array.isArray(db.receipts) || !fs.existsSync(dbFile)]
];
console.log('NEXO Sprint-7O Finance Preflight'); for(const [k,ok] of checks) console.log((ok?'OK ':'WARN')+' '+k); if(checks.some(x=>!x[1])) process.exit(1);