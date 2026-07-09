const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const dataDir=process.env.DATA_DIR || path.join(root,'data');
const dbFile=path.join(dataDir,'nexo_ride_db.json');
const backupDir=path.join(dataDir,'backups');
if(!fs.existsSync(dbFile)){ console.error('Database file not found:',dbFile); process.exit(1); }
fs.mkdirSync(backupDir,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const target=path.join(backupDir,`nexo_ride_s7i_manual_backup_${stamp}.json`);
fs.copyFileSync(dbFile,target);
console.log(JSON.stringify({ok:true, backup_file:target, size_bytes:fs.statSync(target).size, note:'Backup created. Keep data/ folder safe during deploy.'},null,2));
