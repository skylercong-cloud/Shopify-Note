const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../site');
const types = {html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',md:'text/plain',png:'image/png'};
http.createServer((req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if(file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');
    res.setHeader('Content-Type', (types[path.extname(file).slice(1)] || 'application/octet-stream') + '; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    fs.createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(8771,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:8771/'));
