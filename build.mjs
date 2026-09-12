import { build } from 'esbuild';
import { mkdir, copyFile, cp, readFile, stat, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { createRequire } from 'node:module';
import { makeIcons } from './icons.mjs';
const out = resolve('../../outputs/tianya-extension');
await mkdir(out, { recursive: true });
// Use the Node resolver for project-owned files; the native bundler's ancestor
// directory enumeration is unavailable under the desktop filesystem sandbox.
const localFiles={name:'local-project-files',setup(b){
 b.onResolve({filter:/.*/},async args=>{
  const base=args.importer?dirname(args.importer):process.cwd();
  let path=args.path.startsWith('.')?resolve(base,args.path):createRequire(resolve(base,'package.json')).resolve(args.path);
  if(!extname(path)){for(const suffix of ['.js','.jsx','.json','/index.js']){if(await stat(path+suffix).catch(()=>null)){path+=suffix;break;}}}
  return {path,namespace:'project'};
 });
 b.onLoad({filter:/.*/,namespace:'project'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.jsx')?'jsx':args.path.endsWith('.json')?'json':'js'}));
}};
await build({absWorkingDir:process.cwd(),tsconfigRaw:{compilerOptions:{jsx:'react'}},plugins:[localFiles],entryPoints: {panel: './src/panel.jsx', background: './src/background.js', agent: './src/agent.js', practice: './src/practice.jsx'}, bundle: true, outdir: out, format: 'iife', target: 'chrome116', minify: true, legalComments: 'eof', define: {'process.env.NODE_ENV':'"production"'}});
for (const file of ['manifest.json','panel.html','practice.html','style.css']) await copyFile(file, resolve(out,file));
await writeFile(resolve(out,'pdf.worker.mjs'),await readFile('src/pdf-compat.js','utf8')+'\n'+await readFile('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs','utf8'));
await cp('node_modules/pdfjs-dist/cmaps',resolve(out,'cmaps'),{recursive:true});
await cp('node_modules/pdfjs-dist/standard_fonts',resolve(out,'standard_fonts'),{recursive:true});
await makeIcons(out);
const lock=JSON.parse(await readFile('package-lock.json','utf8'));const notices=[];
for(const [path,info] of Object.entries(lock.packages||{})){
 if(!path.startsWith('node_modules/')||info.dev)continue;
 const folder=resolve(path);const files=await readdir(folder).catch(()=>[]);
 const licenseFiles=files.filter(n=>/^(license|licence|notice|copying)(\.|$)/i.test(n));
 notices.push(`\n${path.replace('node_modules/','')} ${info.version||''} (${info.license||'see package'})\n`);
 for(const name of licenseFiles){const contents=await readFile(resolve(folder,name),'utf8').catch(()=>null);if(contents)notices.push(contents);}
}
await writeFile(resolve(out,'THIRD_PARTY_NOTICES.txt'),notices.join('\n'));
console.log(`Built unpacked extension: ${out}`);
