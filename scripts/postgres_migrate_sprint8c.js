const fs=require('fs');
const {spawnSync}=require('child_process');
const path=require('path');
const url=process.env.DATABASE_URL;
if(!url){ console.error('DATABASE_URL missing. Export DATABASE_URL first.'); process.exit(2); }
const sql=path.join(__dirname,'..','docs','SPRINT8C_POSTGRES_MIGRATION.sql');
if(!fs.existsSync(sql)){ console.error('Migration SQL not found:',sql); process.exit(3); }
const r=spawnSync('psql',[url,'-v','ON_ERROR_STOP=1','-f',sql],{stdio:'inherit'});
process.exit(r.status||0);
