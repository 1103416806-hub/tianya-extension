import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {profile as sample} from '../evals/form-cases.mjs';
import {sanitizeProfile,suggest} from '../src/core.js';

// Written local DOM fixture, NOT an authenticated page capture or a claim of
// Feishu widget compatibility. The field names come from the supplied list.
const field=(label,id,extra='')=>`<div class="atsx-form-item"><div class="atsx-form-item-label"><label>${label}</label></div><div><input id="${id}" ${extra}></div></div>`;
const description=id=>`<div class="atsx-form-item"><div class="atsx-form-item-label"><label>描述</label></div><textarea id="${id}"></textarea></div>`;
const edu=n=>`<section><h3>教育经历 ${n}</h3>${field('学校名称',`school${n}`)}${field('专业',`major${n}`)}<div class="atsx-form-item"><div class="atsx-form-item-label"><label>起止时间</label></div><input id="start${n}" type="month" placeholder="开始时间"><input id="end${n}" type="month" placeholder="结束时间"></div></section>`;
const html=`<!doctype html><meta charset="utf-8"><title>本地分组验证（虚构）</title><style>body{font:16px sans-serif;max-width:800px;margin:auto}section{padding:16px;border:1px solid #ddd;margin:16px}input,textarea{padding:8px;margin:6px}</style><h1>本地分组验证，不会投递</h1><form onsubmit="event.preventDefault();window.submitted=true">
<section><h3>基本信息</h3>${field('姓名','name','value="网页原有示例姓名"')}${field('手机号码','phone','placeholder="请输入手机号"')}${field('邮箱','email','type="email"')}<div class="atsx-form-item"><div class="atsx-form-item-label"><label>手机区号</label></div><div class="atsx-select"><div role="combobox"><span>+86</span><input id="country-search"></div></div></div></section>
<section><h3>申请信息</h3>${field('内推码','referral')}${field('意向城市','city')}</section>${edu(1)}${edu(2)}
<section><h3>工作经历</h3>${field('公司名称','work-company')}${field('职位名称','work-title')}${description('work-description')}<label>没有工作经历<input id="no-work" type="checkbox"></label></section>
<section><h3>实习经历</h3>${field('公司名称','intern-company')}${field('职位名称','intern-title')}${description('intern-description')}</section>
<section><h3>项目经历</h3>${field('项目名称','project-name')}${field('项目角色','project-role')}${field('项目链接','project-url')}${description('project-description')}</section>
<section><h3>作品</h3>${field('作品链接','work-url')}${description('portfolio-description')}<label>作品附件<input type="file"></label></section>
<section><h3>获奖</h3>${field('获奖名称','award-name')}${field('获奖时间','award-date','placeholder="YYYY"')}${description('award-description')}</section>
<section><h3>语言能力</h3><div class="atsx-form-item"><div class="atsx-form-item-label"><label>语言</label></div><div class="atsx-select"><div role="combobox"><span>英语</span><input id="language-search"></div></div></div>${field('精通程度','proficiency')}</section>
<section><h3>社交账号</h3>${field('社交平台','social-platform','placeholder="请选择 社交平台"')}${field('URL / ID','social-account','placeholder="请输入 URL / ID"')}</section>
<section><h3>自我评价</h3><label>自我评价<textarea id="summary"></textarea></label></section><button type="submit">提交（测试）</button></form>`;
const extension=resolve('.form-test-extension'),shots=resolve('../../outputs/screenshots');await mkdir(shots,{recursive:true});
await cp(resolve('../../outputs/tianya-extension'),extension,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(extension,'manifest.json'),'utf8'));manifest.host_permissions=['http://127.0.0.1/*'];await writeFile(resolve(extension,'manifest.json'),JSON.stringify(manifest));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launchPersistentContext(resolve('.form-test-profile'),{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,viewport:{width:440,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
const checks=[],errors=[],external=[];
try{
 for(const page of browser.pages())await page.close();
 const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
 await worker.evaluate(()=>Promise.all([chrome.storage.local.clear(),chrome.storage.session.clear()]));
 const webpage=await browser.newPage();await webpage.goto(`http://127.0.0.1:${server.address().port}/form`);
 const tabId=await worker.evaluate(async()=>{const tabs=await chrome.tabs.query({});return tabs.find(t=>t.url?.endsWith('/form')).id;});
 await worker.evaluate(id=>chrome.scripting.executeScript({target:{tabId:id},files:['agent.js']}),tabId);
 const send=async(type,extra={})=>worker.evaluate(({id,msg})=>chrome.tabs.sendMessage(id,msg),{id:tabId,msg:{tianya:true,type,...extra}});
 const scan=(await send('scan')).data;
 assert.ok(scan.fields.find(f=>f.label==='手机号码'));assert.equal(scan.fields.some(f=>f.label==='+86'),false);checks.push('字段容器标题优先于输入提示与当前选项');
 assert.ok(scan.fields.find(f=>f.label==='手机区号').blocked);assert.ok(scan.fields.find(f=>f.label==='语言').blocked);checks.push('自定义下拉的内部输入框只标记手动，不写入');
 const schools=scan.fields.filter(f=>f.label==='学校名称');assert.equal(schools.length,2);assert.notEqual(schools[0].groupId,schools[1].groupId);assert.equal(schools.some(f=>f.repeated),false);checks.push('两段教育拥有不同页面分组，不把所有同名字段混成一组');
 assert.equal(scan.fields.filter(f=>f.label==='开始时间').length,2);assert.equal(scan.fields.filter(f=>f.label==='结束时间').length,2);checks.push('仅凭明确的开始/结束提示拆分日期控件，不猜位置');
 const p=sanitizeProfile({...sample,education:[...sample.education,{school:'第二示例大学',major:'人工智能',degree:'硕士',startDate:'2027-09',endDate:'2030-06'}],experience:[{company:'旧版示例公司',title:'助理',description:'等待本人分类'}]});
 assert.equal(suggest(schools[0],p).key,'');checks.push('多段资料在本人选择前不按网页顺序自动配对');
 await worker.evaluate(async({profile,id})=>{await chrome.storage.local.set({profile});await chrome.storage.session.set({targetTab:{id,title:'本地分组验证',url:'http://127.0.0.1/form'}});},{profile:p,id:tabId});
 const panel=await browser.newPage();panel.on('pageerror',e=>errors.push(e.message));panel.on('dialog',d=>d.accept());panel.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await panel.goto(worker.url().replace('background.js','panel.html'));await panel.getByRole('button',{name:'02 填当前页'}).click();await panel.getByRole('button',{name:'识别当前页面',exact:true}).click();await panel.locator('.mapping').first().waitFor();
 const bindings=panel.getByLabel('整组使用的资料',{exact:true});assert.equal(await bindings.count(),2);
 await bindings.nth(0).selectOption('1');await bindings.nth(1).selectOption('0');
 const schoolMappings=panel.getByLabel('学校名称对应的简历字段');assert.equal(await schoolMappings.nth(0).inputValue(),'education.1.school');assert.equal(await schoolMappings.nth(1).inputValue(),'education.0.school');checks.push('整组选择同时匹配学校、专业和日期，并支持反向配对');
 await panel.setViewportSize({width:440,height:1000});await panel.getByRole('region',{name:/^教育经历 1 ·/}).screenshot({path:resolve(shots,'15-整组选择资料.png')});
 await panel.getByLabel('关闭提示').click();
 for(const width of [340,1280]){await panel.setViewportSize({width,height:1000});await panel.evaluate(()=>scrollTo(0,0));assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel.screenshot({path:resolve(shots,`13-分组填写-${width}.png`)});}checks.push('分组界面在 340 / 1280 px 无横向溢出');
 await panel.getByRole('button',{name:/确认填写 \d+ 项/}).click();await panel.getByText(/已写入并回读 \d+ 项/).waitFor();
 assert.equal(await panel.locator('.mapping.success').count(),30);checks.push('本地样例选择两组教育后，30 项写入并回读成功');
 assert.equal(await webpage.locator('#school1').inputValue(),'第二示例大学');assert.equal(await webpage.locator('#major1').inputValue(),'人工智能');assert.equal(await webpage.locator('#start1').inputValue(),'2027-09');assert.equal(await webpage.locator('#school2').inputValue(),'示例大学');checks.push('所选教育经历真实写入且日期不串组');
 assert.equal(await webpage.locator('#work-description').inputValue(),'虚构工作描述');assert.equal(await webpage.locator('#intern-description').inputValue(),'虚构实习描述');assert.equal(await webpage.locator('#project-description').inputValue(),'虚构项目描述');checks.push('工作、实习、项目的同名描述不串组');
 assert.equal(await webpage.locator('#work-url').inputValue(),'https://example.com/portfolio');assert.equal(await webpage.locator('#award-date').inputValue(),'2025');assert.equal(await webpage.locator('#social-account').inputValue(),'https://example.com/profile');assert.equal(await webpage.locator('#city').inputValue(),'北京');checks.push('作品、获奖、社交、意向城市写入正确资料');
 assert.equal(await webpage.locator('#name').inputValue(),'网页原有示例姓名');assert.equal(await webpage.locator('#referral').inputValue(),'');assert.equal(await webpage.locator('#no-work').isChecked(),false);assert.equal(await webpage.locator('#country-search').inputValue(),'');assert.equal(await webpage.locator('#language-search').inputValue(),'');assert.equal(await webpage.evaluate(()=>!!window.submitted),false);checks.push('原值、内推码、确认项与自定义搜索框保持不动，未提交');
 await webpage.locator('#work-description').fill('人工修改');await panel.getByRole('button',{name:'撤销上次填写'}).click();await panel.getByText(/已撤销 \d+ 项/).waitFor();assert.equal(await webpage.locator('#school1').inputValue(),'');assert.equal(await webpage.locator('#work-description').inputValue(),'人工修改');checks.push('撤销恢复所填项目并保护后续人工修改');
 await panel.getByRole('button',{name:'01 我的简历'}).click();await panel.getByRole('button',{name:'移入实习经历'}).click();
 await panel.waitForFunction(()=>[...document.querySelectorAll('details')].some(d=>d.querySelector('summary strong')?.textContent==='实习经历'&&d.querySelector('summary span')?.textContent==='2 条'));
 await panel.waitForFunction(()=>document.querySelector('.save-indicator')?.textContent.includes('已存本机'));
 const migrated=await worker.evaluate(async()=>(await chrome.storage.local.get('profile')).profile);assert.equal(migrated.internships.length,2);assert.equal(migrated.internships[1].company,'旧版示例公司');checks.push('用户确认后归类旧资料，内容保留且原分组不重复');
 for(let n=0;n<10&&await panel.locator('details[open]').count();n++)await panel.locator('details[open]').first().locator('summary').click();
 // Show the catalogue of actual editable sections in a compact screenshot.
 for(const width of [340,1280]){await panel.setViewportSize({width,height:1000});await panel.locator('.resume-groups').scrollIntoViewIfNeeded();assert.equal(await panel.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel.screenshot({path:resolve(shots,`14-完整资料分组-${width}.png`)});}checks.push('新增资料分组可折叠，窄屏与桌面布局正常');
 const works=panel.locator('.resume-section').filter({has:panel.locator('summary strong').filter({hasText:/^作品$/})});
 await works.locator('summary').click();await works.getByRole('button',{name:'添加作品',exact:true}).click();await works.getByLabel('作品链接',{exact:true}).nth(1).fill('https://example.com/second-work');
 await panel.waitForFunction(()=>document.querySelector('.save-indicator')?.textContent.includes('已存本机'));
 await panel.reload();await panel.getByRole('button',{name:'01 我的简历'}).click();await panel.getByLabel('作品链接',{exact:true}).nth(1).waitFor();
 assert.equal(await panel.getByLabel('作品链接',{exact:true}).nth(1).inputValue(),'https://example.com/second-work');checks.push('新增作品可编辑并在保存后跨刷新保留');
 await panel.getByRole('button',{name:'02 填当前页'}).click();assert.equal(await panel.locator('.mapping').count(),0);checks.push('资料改变后旧字段对应失效，需要重新识别以防填错记录');
 const fresh=(await send('scan')).data,project=fresh.fields.find(f=>f.label==='项目名称');
 await webpage.locator('#project-name').evaluate(el=>document.querySelectorAll('section')[0].append(el));
 const moved=await send('fill',{revision:fresh.revision,items:[{id:project.id,value:'不应写入'}]});assert.equal(moved.data.results[0].status,'skipped');checks.push('控件移到另一个分组后，执行层拒绝旧任务');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);checks.push('无界面错误或额外外部网络请求');
 console.log(`PASS ${checks.length} grouped-form browser checks`);await writeFile('tests/form-browser-result.json',JSON.stringify({date:new Date().toISOString(),checks,scope:'Written local DOM; not authenticated Feishu compatibility',errors,external},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}

