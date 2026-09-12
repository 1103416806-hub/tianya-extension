import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {cp,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {parseLocal,sampleText} from '../src/core.js';
// A test-only copy receives local fixture permissions. The delivered manifest is
// unchanged and continues to use the toolbar's activeTab permission.
const extension=resolve('.web-test-extension');await cp(resolve('../../outputs/tianya-extension'),extension,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(extension,'manifest.json'),'utf8'));manifest.host_permissions=['http://localhost/*'];await writeFile(resolve(extension,'manifest.json'),JSON.stringify(manifest));
const html=`<!doctype html><meta charset="utf-8"><title>本地集成测试</title><form onsubmit="event.preventDefault();window.submitted=true"><label>姓名<input id="name"></label><label>电子邮箱<input id="email" type="email"></label><label>现居城市<input id="city" value="原有内容"></label><label>只读<input readonly></label><label>禁用<input disabled></label><label>身份证号码<input id="identity"></label><label>文件<input type="file"></label><input type="hidden" name="secret"><input type="checkbox" id="consent"><input id="aria" aria-label="手机号码"><label>学校<input id="combo" role="combobox"></label><label>专业<input id="major"></label><label>自我介绍<textarea id="summary" maxlength="5"></textarea></label><button type="submit">提交</button></form><div id="shadow"></div><iframe src="/frame"></iframe><iframe id="cross"></iframe><script>document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<label>技能<input id="skills"></label>';document.querySelector('#cross').src=location.href.replace('localhost','127.0.0.1').replace('/form','/frame');</script>`;
let aiMode='valid';const aiCalls=[];
const server=createServer((req,res)=>{
 if(req.url==='/v1/chat/completions'){
  let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{aiCalls.push({body:JSON.parse(body),authorization:req.headers.authorization});res.setHeader('Content-Type','application/json');if(aiMode==='error'){res.statusCode=429;res.end('{}');return;}res.end(JSON.stringify({choices:[{message:{content:aiMode==='invalid'?'invalid JSON':JSON.stringify(parseLocal(sampleText))}}]}));});return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.url==='/form'?html:'<!doctype html><label>项目名称<input id="project"></label>');
});
await new Promise(r=>server.listen(0,r));const port=server.address().port;
const browser=await chromium.launchPersistentContext(resolve('.web-test-profile'),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const checks=[];
try{
 const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');const page=await browser.newPage();
 await page.goto(`http://localhost:${port}/form`);await page.locator('iframe').first().waitFor();
 const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.includes('/form')).id;});
 await worker.evaluate(id=>chrome.scripting.executeScript({target:{tabId:id},files:['agent.js']}),tabId);checks.push('在真实 HTTP 页注入发布版 agent');
 const send=async(type,extra={})=>{const r=await worker.evaluate(({id,msg})=>chrome.tabs.sendMessage(id,msg),{id:tabId,msg:{tianya:true,type,...extra}});return r;};
 let scan=(await send('scan')).data;
 assert.ok(scan.fields.find(f=>f.label==='手机号码'));checks.push('ARIA 标签识别');
 assert.ok(scan.fields.find(f=>f.label==='技能'));checks.push('开放 Shadow DOM 识别');
 assert.ok(scan.fields.find(f=>f.label==='项目名称'));checks.push('同源 iframe 识别');
 assert.equal(scan.inaccessible,1);checks.push('跨域 iframe 明确报告无法访问');
 assert.ok(scan.fields.find(f=>f.label==='学校').blocked);checks.push('自定义 combobox 不自动填');
 assert.ok(scan.fields.find(f=>f.label==='只读').blocked);assert.ok(scan.fields.find(f=>f.label==='禁用').blocked);checks.push('只读与禁用控件拦截');
 assert.equal(scan.fields.some(f=>f.label==='secret'),false);checks.push('隐藏字段不扫描');
 const field=label=>scan.fields.find(f=>f.label===label);
 const items=[['姓名','测试用户'],['电子邮箱','test@example.com'],['现居城市','应被拦截'],['身份证号码','应被拦截'],['手机号码','13800138000'],['技能','口译'],['项目名称','测试项目'],['自我介绍','这是超过五个字的内容']].map(([label,value])=>({id:field(label).id,value}));
 const filled=await send('fill',{revision:scan.revision,items});assert.equal(filled.ok,true);assert.equal(filled.data.results.filter(r=>r.status==='filled').length,5);checks.push('HTTP 页面写入与同源嵌套控件回读');
 assert.equal(await page.locator('#city').inputValue(),'原有内容');assert.equal(await page.locator('#identity').inputValue(),'');assert.equal(await page.locator('#summary').inputValue(),'');checks.push('执行层再次拦截原值、敏感字段和超长内容');
 assert.equal(await page.evaluate(()=>!!window.submitted),false);assert.equal(await page.locator('#consent').isChecked(),false);checks.push('未提交、未勾选同意');
 await page.locator('#name').fill('手动修改');const undone=(await send('undo')).data;assert.equal(undone.count,4);assert.equal(undone.skipped,1);checks.push('跨控件撤销且保护后续人工修改');
 scan=(await send('scan')).data;await page.locator('#major').evaluate(el=>el.replaceWith(el.cloneNode()));const stale=await send('fill',{revision:scan.revision,items:[{id:field('专业').id,value:'不应填入'}]});assert.equal(stale.data.results[0].status,'skipped');checks.push('控件被重建后停止写入');
 scan=(await send('scan')).data;await page.evaluate(()=>history.pushState({},'','/changed'));const route=await send('fill',{revision:scan.revision,items:[{id:field('专业').id,value:'不应填入'}]});assert.equal(route.ok,false);checks.push('SPA 路由变化后拒绝旧识别结果');
 await page.evaluate(()=>history.replaceState({},'','/form'));scan=(await send('scan')).data;const invalid=await send('fill',{revision:scan.revision,items:[{id:field('电子邮箱').id,value:'not-an-email'}]});assert.equal(invalid.data.results[0].status,'failed');assert.equal(await page.locator('#email').inputValue(),'');checks.push('网页格式校验失败时恢复空值');
 const panel=await browser.newPage();panel.on('dialog',d=>d.accept());await panel.goto(worker.url().replace('background.js','panel.html'));await panel.getByRole('button',{name:'01 我的简历'}).click();await panel.locator('textarea.source').fill(sampleText);await panel.getByLabel('AI 与隐私设置').click();
 await panel.getByLabel('模型服务地址').fill(`http://localhost:${port}/v1`);await panel.getByLabel('模型名称',{exact:true}).fill('mock-protocol-only');await panel.getByLabel('API Key',{exact:true}).fill('test-session-key');
 await panel.getByRole('button',{name:'保存设置并 AI 解析'}).click();await panel.getByRole('alert').filter({hasText:'同意'}).waitFor();assert.equal(aiCalls.length,0);checks.push('无云端同意时零 API 请求');
 await panel.locator('input[type=checkbox]').check();await panel.getByRole('button',{name:'保存设置并 AI 解析'}).click();await panel.getByText('AI 结果已进入可编辑简历',{exact:false}).waitFor();assert.equal(aiCalls.length,1);assert.equal(aiCalls[0].body.messages[1].content,sampleText);assert.equal(aiCalls[0].authorization,'Bearer test-session-key');checks.push('模拟 AI 服务：只发送简历文字与模型请求，成功结果可编辑');
 const sentSchema=JSON.parse(aiCalls[0].body.messages[0].content.split('字段结构：')[1]);
 for(const group of ['employment','internships','works','awards','languages','socials'])assert.ok(Object.keys(sentSchema[group][0]).length>0);
 assert.ok(aiCalls[0].body.messages[0].content.includes('无法区分的放 experience'));checks.push('模拟 AI 协议含完整新资料结构及工作/实习不猜测约束；不是模型质量评测');
 const local=await worker.evaluate(()=>chrome.storage.local.get(null));const session=await worker.evaluate(()=>chrome.storage.session.get('apiKey'));assert.equal(JSON.stringify(local).includes('test-session-key'),false);assert.equal(session.apiKey,'test-session-key');checks.push('API Key 仅在会话存储，不进入本机长期存储');
 aiMode='invalid';await panel.getByRole('button',{name:'保存设置并 AI 解析'}).click();await panel.getByRole('alert').filter({hasText:'有效 JSON'}).waitFor();checks.push('模拟 AI 服务：无效 JSON 明确报错');
 aiMode='error';await panel.getByRole('button',{name:'保存设置并 AI 解析'}).click();await panel.getByRole('alert').filter({hasText:'429'}).waitFor();checks.push('模拟 AI 服务：限流错误可见');
 await panel.getByRole('button',{name:'01 我的简历'}).click();assert.equal(await panel.getByLabel('姓名',{exact:true}).inputValue(),'林晓雨');checks.push('AI 失败保留原简历');
 console.log(`PASS ${checks.length} web integration checks`);await writeFile('tests/web-result.json',JSON.stringify({date:new Date().toISOString(),checks,testOnlyPermission:'http://localhost/*; released manifest unchanged',ai:'Mock protocol only, not a real model evaluation'},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}

