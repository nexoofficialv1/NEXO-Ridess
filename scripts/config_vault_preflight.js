const http=require('http');
const port=process.env.PORT||3333;
const path='/api/platform/config-vault-readiness';
http.get({host:'127.0.0.1',port,path},res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>{try{const j=JSON.parse(data);console.log(JSON.stringify(j,null,2));process.exit(j.ok?0:1)}catch(e){console.error(data);process.exit(1)}})}).on('error',e=>{console.error('Server not running for config vault preflight:',e.message);process.exit(1)});
