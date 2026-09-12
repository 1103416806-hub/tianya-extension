import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('../../outputs');
createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4179');const path=decodeURIComponent(url.pathname).replace(/^\//,'')||'开始使用-填呀.html';
  if(!['开始使用-填呀.html','填呀-使用说明.md','填呀-测试说明.md','填呀-0.1.1更新说明.md'].includes(path)&&!/^填呀插件-0\.1\.\d+\.zip$/.test(path)&&!/^screenshots\/[0-9]{2}-[^/]+\.png$/.test(path)){res.writeHead(404);res.end('Not found');return;}
  const types={'.html':'text/html; charset=utf-8','.md':'text/plain; charset=utf-8','.png':'image/png','.zip':'application/zip'};
  res.setHeader('Content-Type',types[extname(path)]);res.end(await readFile(resolve(root,path)));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4179,'127.0.0.1',()=>console.log('Install walkthrough: http://127.0.0.1:4179'));
