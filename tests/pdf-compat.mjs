import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {cp,readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
const runtime=createRequire(resolve(process.env.TIANYA_FIXTURE_MODULES || resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node'),'package.json'));
const {PDFDocument,StandardFonts}=runtime('pdf-lib');
const baseline=process.argv.includes('--expect-original-error');
const extra=process.argv.includes('--missing-more-apis');
const fixtureDir=await mkdtemp(resolve('.pdf-compat-'));
const extension=resolve(fixtureDir,'extension');
await cp(resolve('../../outputs/tianya-extension'),extension,{recursive:true});
// Remove native APIs BEFORE PDF.js initializes, including inside the real PDF
// worker. Modifying only the window would not reproduce the reported failure.
const disable=`delete Uint8Array.prototype.toHex;${extra?"delete Uint8Array.prototype.toBase64;delete Uint8Array.fromBase64;delete Uint8Array.fromHex;delete Uint8Array.prototype.setFromBase64;delete Uint8Array.prototype.setFromHex;delete Promise.withResolvers;":''}globalThis.__tianyaMissingToHexAtStartup=typeof Uint8Array.prototype.toHex==='undefined';`;
const workerPath=resolve(extension,'pdf.worker.mjs');await writeFile(workerPath,disable+'\n'+await readFile(workerPath,'utf8')+'\n;globalThis.postMessage({__tianyaCompatTest:true,missingAtStartup:globalThis.__tianyaMissingToHexAtStartup,current:typeof Uint8Array.prototype.toHex});');
const browser=await chromium.launchPersistentContext(resolve(fixtureDir,'browser-profile'),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
try{
 await browser.addInitScript({content:disable+`const OriginalWorker=globalThis.Worker;globalThis.Worker=class extends OriginalWorker{constructor(...args){super(...args);this.addEventListener('message',event=>{if(event.data?.__tianyaCompatTest){globalThis.__tianyaWorkerCompat=event.data;event.stopImmediatePropagation();}});}};`});
 const background=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
 const panel=await browser.newPage();const pageErrors=[];panel.on('pageerror',e=>pageErrors.push(e.message));
 await panel.goto(background.url().replace('background.js','panel.html'));
 await panel.getByRole('button',{name:'01 我的简历'}).click();
 assert.equal(await panel.evaluate(()=>globalThis.__tianyaMissingToHexAtStartup),true);
 const pdf=await PDFDocument.create();const page=pdf.addPage();page.drawText('Name: PDF Compatibility\nEmail: compatibility@example.com',{x:40,y:700,size:14,font:await pdf.embedFont(StandardFonts.Helvetica)});
 const workerReady=panel.waitForEvent('worker');
 await panel.getByLabel('选择简历文件',{exact:true}).setInputFiles({name:'compatibility.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
 const pdfWorker=await workerReady;
 if(baseline){
  await panel.getByRole('alert').filter({hasText:'toHex is not a function'}).waitFor();
  const message=await panel.getByRole('alert').innerText();assert.equal(await panel.locator('textarea.source').inputValue(),'');
  console.log('REPRODUCED ORIGINAL FAILURE: '+message);
 }else{
  await panel.getByText(/已提取 \d+ 个字符/).waitFor();
  assert.ok((await panel.locator('textarea.source').inputValue()).includes('compatibility@example.com'));
  assert.deepEqual(await panel.evaluate(()=>globalThis.__tianyaWorkerCompat),{__tianyaCompatTest:true,missingAtStartup:true,current:'function'});
  assert.equal(await panel.evaluate(()=>typeof Uint8Array.prototype.toHex),'function');
  assert.deepEqual(pageErrors,[]);
  console.log(`PASS PDF import with ${extra?'typed-array encoding APIs and Promise.withResolvers':'toHex'} initially absent in window AND worker`);
 }
}finally{await browser.close();}

