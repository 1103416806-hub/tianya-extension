import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const extension=resolve('../../outputs/tianya-extension'),shots=resolve('../../outputs/screenshots');
await mkdir(shots,{recursive:true});
const browser=await chromium.launchPersistentContext(resolve('.navigation-test-profile'),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:440,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const passed=[],errors=[],requests=[];
try{
 const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
 for(const restored of browser.pages())await restored.close();
 await worker.evaluate(()=>Promise.all([chrome.storage.local.clear(),chrome.storage.session.clear()]));
 const panel=await browser.newPage();panel.on('pageerror',e=>errors.push(e.message));panel.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await panel.goto(worker.url().replace('background.js','panel.html'));
 await panel.getByRole('heading',{name:'一份简历，反复使用。'}).waitFor();
 assert.deepEqual(await panel.locator('.tabs button').allTextContents(),['01我的简历','02填当前页']);
 assert.equal(await panel.getByText('公司推荐',{exact:true}).count(),0);passed.push('默认简历页只保留两个核心入口');
 assert.equal(await panel.locator('textarea.source').inputValue(),'');
 assert.equal(await panel.getByLabel('姓名',{exact:true}).inputValue(),'');
 assert.equal(await panel.getByLabel('电子邮箱',{exact:true}).inputValue(),'');
 await panel.waitForFunction(()=>document.querySelector('.save-indicator')?.textContent.includes('已存本机'));
 passed.push('首次打开没有预填身份信息');
 const opened=browser.waitForEvent('page');await panel.getByRole('button',{name:'安全练习'}).click();const practice=await opened;await practice.waitForLoadState();
 assert.ok(practice.url().endsWith('/practice.html'));assert.equal(await panel.getByLabel('姓名',{exact:true}).inputValue(),'');
 const target=await worker.evaluate(()=>chrome.storage.session.get('targetTab'));assert.equal(target.targetTab.title,'填呀安全练习页');passed.push('安全练习打开本地表单且不会自动载入虚构身份');
 for(const width of [340,1280]){await panel.setViewportSize({width,height:1000});await panel.evaluate(()=>scrollTo(0,0));assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel.screenshot({path:resolve(shots,`16-双入口-${width}.png`),fullPage:true});}
 passed.push('双入口在窄屏和桌面无横向溢出');
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);passed.push('本地流程无页面错误或外部请求');
 const guide=await browser.newPage();await guide.setViewportSize({width:1280,height:1000});await guide.goto(pathToFileURL(resolve('../../outputs/开始使用-填呀.html')).href);await guide.screenshot({path:resolve(shots,'06-安装指引.png'),fullPage:true});
 console.log(`PASS ${passed.length} navigation/privacy UX checks`);
 await writeFile('tests/navigation-privacy-result.json',JSON.stringify({date:new Date().toISOString(),passed,errors,requests},null,2));
}finally{await browser.close();}
