import test from 'node:test';
import assert from 'node:assert/strict';
import {profile,cases} from '../evals/form-cases.mjs';
import {suggest,parseLocal,sanitizeProfile,classifyLegacy,profileSchema,emptyProfile,contextSection,fieldName} from '../src/core.js';
for(const c of cases)test(`Application field: ${c.id}`,()=>assert.equal(suggest(c.field,c.profile||profile,c.binding).key,c.expected));
test('Legacy records are retained without guessing their category',()=>{
 const legacy={company:'旧版示例公司',title:'助理',description:'原有描述'};
 const p=sanitizeProfile({name:'张三',experience:[legacy]});
 assert.equal(p.experience[0].company,legacy.company);assert.deepEqual(p.internships,[]);assert.deepEqual(p.employment,[]);
 assert.equal(suggest({label:'公司名称',context:'工作经历'},p).key,'');
 const next=classifyLegacy(p,0,'internships');assert.equal(next.internships[0].description,legacy.description);assert.equal(next.experience.length,0);assert.equal(p.experience.length,1);
 assert.throws(()=>classifyLegacy(p,0,'projects'));
});
test('Missing desired city never inherits current city',()=>{const p=sanitizeProfile({city:'上海'});assert.equal(p.desiredCity,'');assert.equal(suggest({label:'意向城市'},p).key,'');});
test('Expanded fields survive backup sanitization',()=>{
 const cleaned=sanitizeProfile({...profile,secret:'not retained'});
 assert.equal(cleaned.works[0].url,profile.works[0].url);assert.equal(cleaned.awards[0].awardDate,'2025');assert.equal(cleaned.socials[0].account,profile.socials[0].account);assert.equal(cleaned.secret,undefined);
 assert.deepEqual(Object.keys(profileSchema()).sort(),Object.keys(emptyProfile()).sort());
 assert.ok(profileSchema().internships[0].hasOwnProperty('description'));
});
test('Explicit local templates parse into distinct groups',()=>{
 const p=parseLocal('姓名：张三\n意向城市：北京\n工作经历\n公司名称：示例工作公司\n描述：工作文字\n实习经历\n公司名称：示例实习公司\n描述：实习文字\n项目经历\n项目名称：示例项目\n项目链接：https://example.com/project\n作品\n作品链接：https://example.com/work\n描述：作品文字\n获奖\n获奖名称：示例奖\n获奖时间：2025\n语言能力\n语言：英语\n精通程度：熟练\n社交账号\n社交平台：GitHub\nURL / ID：https://example.com/profile');
 assert.equal(p.employment[0].description,'工作文字');assert.equal(p.internships[0].description,'实习文字');assert.equal(p.experience.length,0);
 assert.equal(p.projects[0].url,'https://example.com/project');assert.equal(p.works[0].description,'作品文字');assert.equal(p.awards[0].name,'示例奖');assert.equal(p.languages[0].proficiency,'熟练');assert.equal(p.socials[0].platform,'GitHub');assert.equal(p.desiredCity,'北京');
});
test('Wrong-section and duplicate controls never inherit a forced record',()=>{
 assert.equal(suggest({label:'学校名称',context:'工作经历'},profile,{recordIndex:0}).key,'');
 assert.equal(suggest({label:'学校名称',context:'教育经历',repeated:true},profile,{recordIndex:0}).key,'');
 assert.equal(suggest({label:'学校名称',context:'教育经历'},profile,{recordIndex:3}).key,'');
 assert.equal(suggest({label:'公司名称'},profile).key,'');
});
test('Heading normalization does not use broad substring guesses',()=>{
 assert.equal(contextSection('教育经历-2'),'education');assert.equal(contextSection('工作经历'),'employment');assert.equal(contextSection('实习经历'),'internships');assert.equal(contextSection('不属于教育经历的介绍'),'');
 assert.equal(fieldName('请输入手机号'),'手机号');assert.equal(fieldName('请选择 社交平台'),'社交平台');assert.equal(fieldName('紧急联系人手机'),'紧急联系人手机');
});
