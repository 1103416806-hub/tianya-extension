export const basics = [['name','姓名'],['phone','手机号码'],['email','电子邮箱'],['city','现居城市'],['desiredCity','意向城市'],['skills','技能 / 证书'],['summary','自我介绍']];
const jobFields=[['company','公司名称'],['title','职位名称'],['startDate','开始时间'],['endDate','结束时间'],['description','描述']];
export const groups = {
  education: {title:'教育经历', fields:[['school','学校'],['major','专业'],['degree','学历'],['startDate','开始日期'],['endDate','结束日期']]},
  employment: {title:'工作经历',fields:jobFields},
  internships: {title:'实习经历',fields:jobFields},
  projects: {title:'项目经历', fields:[['name','项目名称'],['role','担任角色'],['startDate','开始日期'],['endDate','结束日期'],['url','项目链接'],['description','项目描述']]},
  works:{title:'作品',fields:[['url','作品链接'],['description','描述']]},
  awards:{title:'获奖',fields:[['name','获奖名称'],['awardDate','获奖时间'],['description','描述']]},
  languages:{title:'语言能力',fields:[['language','语言'],['proficiency','精通程度']]},
  socials:{title:'社交账号',fields:[['platform','社交平台'],['account','URL / ID']]},
  experience: {title:'旧版工作 / 实习（待分类）',fields:jobFields}
};
export const emptyProfile = () => ({...Object.fromEntries(basics.map(([key])=>[key,''])),...Object.fromEntries(Object.keys(groups).map(key=>[key,[]]))});
export const profileSchema = () => ({...Object.fromEntries(basics.map(([key])=>[key,''])),...Object.fromEntries(Object.entries(groups).map(([key,g])=>[key,[Object.fromEntries(g.fields.map(([field])=>[field,'']))]]))});
export const sampleText = `姓名：林晓雨\n手机号码：13800138000\n电子邮箱：xiaoyu@example.com\n现居城市：杭州\n技能：英语口译、Excel、Figma\n自我介绍：喜欢把复杂的问题整理清楚，关注用户体验。\n\n教育经历\n学校：示例大学\n专业：英语口译\n学历：硕士\n开始日期：2024-09\n结束日期：2027-06\n\n实习经历\n公司：示例文化传播有限公司\n职位：口译实习生\n开始日期：2025-07\n结束日期：2025-09\n工作内容：参与活动接待与双语资料整理。\n\n项目经历\n项目名称：校园双语导览\n担任角色：项目负责人\n项目描述：组织同学编写双语导览手册，并完成现场讲解。`;
export const norm = s => String(s ?? '').toLowerCase().replace(/[\s\u200b*：:（）()\[\]【】_\-./]/g,'');
export const aliases = {
 name:['姓名','真实姓名','中文姓名','name','fullname','yourname'],phone:['手机','手机号','手机号码','联系电话','电话','mobile','phone','phonenumber'],email:['邮箱','电子邮箱','电子邮件','email','emailaddress'],city:['现居城市','现居住城市','当前城市','city'],desiredCity:['意向城市','期望工作城市','意向工作地点'],skills:['技能','技能证书','专业技能','skills'],summary:['自我介绍','自我评价','个人简介','summary'],
 school:['学校','学校名称','毕业院校','毕业学校','就读学校','院校名称','school','university'],major:['专业','所学专业','专业名称','major'],degree:['学历','最高学历','educationlevel','degree'],
 company:['公司','公司名称','企业名称','实习公司','工作单位','company','employer'],title:['职位','职位名称','岗位名称','担任职位','所任职位','所在职位','职务','jobtitle'],role:['担任角色','项目角色','role'],description:['描述','说明','作品描述','工作内容','工作描述','实习内容','项目描述','项目内容','description'],startDate:['开始日期','开始时间','入学时间','入职时间','startdate'],endDate:['结束日期','结束时间','毕业时间','离职时间','enddate'],projectName:['项目名称','projectname'],
 projectUrl:['项目链接'],portfolioUrl:['作品链接'],awardName:['获奖名称','奖项名称'],awardDate:['获奖时间','获奖日期'],language:['语言','语言种类'],proficiency:['精通程度','熟练程度'],platform:['社交平台'],account:['URL / ID','账号链接'],dateRange:['起止时间','起止日期']
};
export const sensitive = s => /密码|验证码|身份证|证件|护照|民族|政治|婚姻|性别|宗教|残疾|健康|薪资|薪酬|期望工资|紧急联系人|紧急联系电话|推荐人|推荐码|内推码|微信|同意|授权|隐私|password|captcha|passport|gender|salary|consent|socialsecurity/i.test(s);
export const fieldName = value => norm(String(value||'').trim().replace(/^请(?:输入|填写|选择)\s*(?:您的|你的)?\s*/,'').replace(/[（(]必填[）)]$/,''));
export function contextSection(value){
 const heading=norm(value).replace(/\d+$/,'');
 const headings={education:['教育经历','教育背景','education'],employment:['工作经历','工作经验','employment'],internships:['实习经历','实习经验','internship','internships'],experience:['实习工作经历','工作实习经历','experience'],projects:['项目经历','项目经验','projects'],works:['作品','作品集'],awards:['获奖','获奖经历','获奖情况'],languages:['语言能力','语言技能'],socials:['社交账号']};
 return Object.keys(headings).find(key=>headings[key].includes(heading))||'';
}
const recordKey=key=>({projectName:'name',awardName:'name',projectUrl:'url',portfolioUrl:'url'})[key]||key;
export function classifyLegacy(profile,index,destination){
 if(!['employment','internships'].includes(destination)||!profile.experience?.[index])throw Error('请选择要归类的旧版经历');
 if((profile[destination]||[]).length>=10)throw Error('目标分组最多保留 10 条，请先整理');
 return {...profile,[destination]:[...(profile[destination]||[]),{...profile.experience[index]}],experience:profile.experience.filter((_,i)=>i!==index)};
}
export function sanitizeProfile(value) {
 const out=emptyProfile();
 if(!value || typeof value!=='object' || Array.isArray(value)) throw Error('解析结果不是简历对象。');
 const clean=v=>typeof v==='string'?v.trim().slice(0,8000):'';
 for(const [key] of basics) out[key]=clean(value[key]);
 for(const [key,group] of Object.entries(groups)) out[key]=(Array.isArray(value[key])?value[key]:[]).slice(0,10).filter(x=>x&&typeof x==='object').map(item=>Object.fromEntries(group.fields.map(([field])=>[field,clean(item[field])])));
 return out;
}
const phonePattern=/(?<!\d)(?:\+?86[- \t]*)?1[3-9]\d[- \t]?\d{4}[- \t]?\d{4}(?!\d)/g;
const emailPattern=/[A-Z0-9._%+-]+[ \t]*@[ \t]*[A-Z0-9-]+(?:[ \t]*\.[ \t]*[A-Z0-9-]+)+/gi;
const otherPerson=/推荐人|紧急联系人|紧急联系电话|证明人|指导老师|导师|referee|reference contact/i;
const surnameChars=new Set('赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍虞万支柯管卢莫房裘缪干解应宗丁宣邓郁单杭洪包诸左石崔吉龚程嵇邢裴陆荣翁荀羊甄曲封储靳段巫焦巴弓牧隗山谷车侯全班秋仲伊宫宁仇栾暴甘厉戎祖武符刘景詹束龙叶幸司黎薄印宿白蒲邰从鄂索咸籍赖卓蔺屠蒙池乔阴胥能苍双闻莘党翟谭贡劳逄姬申扶堵冉宰郦雍郤璩桑桂濮牛寿通边扈燕冀郏浦尚农温别庄晏柴瞿阎连习艾鱼容向古易慎廖庾终暨居衡步耿满弘匡国文寇广禄阙东殴殳沃利蔚越夔隆师巩厍聂晁勾敖融冷訾辛阚简饶空曾毋沙乜养鞠须丰巢关蒯相查后荆红游竺权逯盖益桓公肖付兰覃牟佟');
const compoundSurnames=['欧阳','司马','上官','诸葛','东方','皇甫','尉迟','公孙','慕容','司徒','司空','令狐','宇文','长孙','端木','夏侯','南宫','独孤','闻人','申屠','仲孙'];
const notAName=/简历|公司|集团|大学|学院|学校|产品|经理|实习|岗位|项目|工作|教育|经验|专业|技能|求职|个人|信息|应届|校招|招聘|联系|电话|邮箱|地址|城市|上海|北京|杭州|广州|深圳|张家口|石家庄|香港|澳门|台湾|昆明|长春|大连|郑州|沈阳|海口|王者荣耀|姓名|姓氏/;
function plausibleHeaderName(value){const v=value.replace(/[ \t]/g,'');return /^[\u3400-\u9fff]{2,4}$/.test(v)&&!notAName.test(v)&&(surnameChars.has(v[0])||compoundSurnames.some(s=>v.startsWith(s)&&v.length>s.length));}
export function parseLocalDetailed(raw) {
 const p=emptyProfile(),evidence={},warnings=[];
 const text=String(raw).slice(0,100000).normalize('NFKC').replace(/[\u200b-\u200d\uFEFF]/g,'');
 // Inline contact labels are common in resume headers. Split those explicit
 // boundaries without relying on a label on every original line.
 const expanded=text.replace(/[ \t|｜;；]+(?=(?:姓名|姓\s+名|手机号码|手机号|手机|联系电话|电话|电子邮箱|邮箱|现居城市|Name|Email|Phone|Mobile)\s*[:：])/gi,'\n');
 const lines=expanded.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 const personalLines=lines.filter((line,i)=>!otherPerson.test(line)&&!(i>0&&otherPerson.test(lines[i-1])&&!/\d|@/.test(lines[i-1])));
 const contacts=personalLines.join('\n');
 const uniqueMatches=(value,pattern,clean)=>[...new Set((value.match(pattern)||[]).map(clean))];
 const cleanPhone=x=>x.replace(/[- \t]/g,'').replace(/^\+?86/,'');
 const cleanEmail=x=>x.replace(/[ \t]/g,'');
 const emails=uniqueMatches(contacts,emailPattern,cleanEmail),phones=uniqueMatches(contacts,phonePattern,cleanPhone);
 if(emails.length===1){p.email=emails[0];evidence.email={method:'联系方式',source:personalLines.find(l=>uniqueMatches(l,emailPattern,cleanEmail).includes(p.email))};}
 if(phones.length===1){p.phone=phones[0];evidence.phone={method:'联系方式',source:personalLines.find(l=>uniqueMatches(l,phonePattern,cleanPhone).includes(p.phone))};}
 let section='',record=null,lastKey='';
 const orderedAliases=Object.entries(aliases).flatMap(([key,items])=>items.map(label=>({key,label}))).sort((a,b)=>b.label.length-a.label.length);
 const labeled=line=>{
  const m=line.match(/^([^:：]{1,24})[:：]\s*(.*)$/);
  if(m){const found=orderedAliases.find(a=>norm(a.label)===norm(m[1]));return found?{key:found.key,value:m[2].trim()}:null;}
  for(const {key,label} of orderedAliases){if(norm(line)===norm(label))return {key,value:''};if(line.toLowerCase().startsWith(label.toLowerCase())&&/\s/.test(line[label.length]||''))return {key,value:line.slice(label.length).trim()};}
  return null;
 };
 for(let i=0;i<lines.length;i++) {const line=lines[i];
  const heading=norm(line.replace(/[：:]$/,''));
  const next=contextSection(heading);
  if(next){section=next;record={};p[section].push(record);lastKey='';continue;}
  const m=labeled(line);
  if(m&&!otherPerson.test(line)){let {key,value:val}=m;lastKey='';
   if(!val&&lines[i+1]&&!labeled(lines[i+1])&&!contextSection(lines[i+1])&&!/经历|背景|经验/.test(lines[i+1]))val=lines[++i];
   if(basics.some(([k])=>k===key)){
    if(key==='phone'){const values=uniqueMatches(val,phonePattern,cleanPhone);val=values.length===1?values[0]:'';}
    if(key==='email'){const values=uniqueMatches(val,emailPattern,cleanEmail);val=values.length===1?values[0]:'';}
    if(key==='name')val=val.replace(/[ \t]+(?:男|女|\d+岁|\d{4}届).*$/,'').trim();
    if(val){p[key]=val;evidence[key]={method:'明确标签',source:line+(line===lines[i]?'':' '+lines[i])};}continue;
   }
   if(section){const field=recordKey(key);
    if(groups[section].fields.some(([k])=>k===field)){
     if(record[field]){record={};p[section].push(record);}
     record[field]=val;lastKey=field;
    }
   }
  }else if(record&&lastKey==='description'){record.description+='\n'+line;}
 }
 if(!p.name){
  const header=[];for(const line of lines.slice(0,16)){if(/^(?:教育(?:经历|背景)|实习经历|工作经历|项目(?:经历|经验)|校园经历|获奖经历|education|experience|projects)\s*[:：]?$/i.test(line))break;header.push(line);}
  const candidates=new Map();const add=(candidate,source)=>{const name=candidate.replace(/[ \t]/g,'');if(plausibleHeaderName(name))candidates.set(name,source);};
  for(let i=0;i<header.length;i++){
   const line=header[i];if(otherPerson.test(line)||/[:：]/.test(line))continue;
   // Name-only header lines, or a name separated from contacts/job title.
   const beforeContact=line.split(/(?:\+?86[ -]*)?1[3-9]\d|[A-Za-z0-9._%+-]+[ \t]*@/)[0].trim();
   const firstColumn=beforeContact.split(/[|｜;；]/)[0].trim();
   add(firstColumn,line);
   const withRole=firstColumn.match(/^([\u3400-\u9fff]{2,4})\s+(?=(?:AI|产品|求职|应聘|设计|开发|运营|口译|翻译|数据|软件))/i);if(withRole)add(withRole[1],line);
   if(/^[\u3400-\u9fff]$/.test(line)){
    let joined=line,j=i+1;while(j<header.length&&/^[\u3400-\u9fff]$/.test(header[j])&&joined.length<4)joined+=header[j++];
    if(j>i+1){add(joined,header.slice(i,j).join(' / '));i=j-1;}
   }
  }
  if(candidates.size===1){const [name,source]=[...candidates][0];p.name=name;evidence.name={method:'简历抬头候选，请核对',source};warnings.push('姓名根据简历抬头初步识别，请对照原文确认。');}
  if(candidates.size>1)warnings.push('抬头出现多个可能的姓名，未替你做选择。');
 }
 for(const section of Object.keys(groups))p[section]=p[section].filter(item=>Object.values(item).some(Boolean));
 if(p.experience.length)warnings.push('未区分工作和实习的经历保留在待分类分组，请自行归类。');
 if(!p.name)warnings.push('未识别到可靠的姓名，请手动补充或使用 AI 解析。');
 return {profile:sanitizeProfile(p),evidence,warnings};
}
export function parseLocal(raw){return parseLocalDetailed(raw).profile;}
export function facts(profile) {
 const list=basics.map(([key,label])=>({key,label,value:profile[key]||''}));
 for(const [section,g] of Object.entries(groups)) (profile[section]||[]).forEach((item,index)=>g.fields.forEach(([field,label])=>list.push({key:`${section}.${index}.${field}`,label:`${g.title} ${index+1} · ${label}`,value:item[field]||''})));
 return list.filter(x=>x.value);
}
export function suggest(field, profile, binding={}) {
 if(field.blocked || sensitive(field.label))return {key:'',reason:field.blocked||'敏感或确认类字段，请手动填写'};
 if(/^\+\d{1,4}$/.test(field.label)||/^(男|女)$/.test(field.label))return {key:'',reason:'区号或选项内容不是独立资料字段，请在网页中确认'};
 const names=[field.label,field.autocomplete==='tel'?'phone':field.autocomplete].filter(Boolean).map(fieldName);
 let key=Object.keys(aliases).find(k=>aliases[k].some(a=>names.includes(norm(a))));
 if(!key)return {key:'',reason:'未确定对应信息，请手动选择'};
 if(key==='dateRange')return {key:'',reason:'起止时间需分别定位开始和结束控件，请在网页中选择'};
 if(basics.some(([k])=>k===key))return {key:profile[key]?key:'',reason:profile[key]?'标签匹配':'简历中还没有这项信息'};
 let section=contextSection(field.context);
 if(!section){
  if(['school','major','degree'].includes(key))section='education';
  if(['company','title'].includes(key)){const choices=['employment','internships','experience'].filter(s=>profile[s]?.length);if(choices.length===1)section=choices[0];}
  if(['projectName','role','projectUrl'].includes(key))section='projects';
  if(key==='portfolioUrl')section='works';
  if(['awardName','awardDate'].includes(key))section='awards';
  if(['language','proficiency'].includes(key))section='languages';
  // URL / ID and platform are only meaningful inside a social-account section.
 }
 if(!section)return {key:'',reason:'日期或描述所属经历不明确，请选择'};
 key=recordKey(key);
 if(!groups[section].fields.some(([k])=>k===key))return {key:'',reason:'字段与所在分组不一致，请核对'};
 const records=profile[section]||[];
 if(!records.length)return {key:'',reason:profile.experience?.length&&['employment','internships'].includes(section)?'旧版经历尚未归类，请到「我的简历」确认工作或实习':'简历中还没有这类资料，请先补充'};
 const chosen=Number.isInteger(binding.recordIndex)?binding.recordIndex:records.length===1?0:-1;
 if(chosen<0||chosen>=records.length||field.repeated)return {key:'',reason:field.repeated?'同一分组中字段重复，无法安全批量对应，请逐项选择':'存在多段经历，请先为这组选择一条资料'};
 const path=`${section}.${chosen}.${key}`;
 return {key:facts(profile).some(x=>x.key===path)?path:'',reason:records[chosen]?.[key]?'根据字段与所选资料分组匹配':'这条资料中还没有该字段，请补充'};
}
export function mappedValue(field, value) {
 if(!value)return {error:'简历信息为空'};
 if(field.options){
  const degreeAliases={'硕士':['硕士研究生','研究生','master','masters'],'本科':['大学本科','学士','bachelor','bachelors'],'博士':['博士研究生','phd','doctorate'],'专科':['大专','大学专科']};
  const possible=[value,...(degreeAliases[value]||[])].map(norm);
  const choices=field.options.filter(o=>!o.disabled && o.value && (possible.includes(norm(o.label))||possible.includes(norm(o.value))));
  return choices.length===1?{value:choices[0].value,display:choices[0].label}:{error:'下拉选项没有唯一匹配，请手动选择'};
 }
 if(field.type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(value))return {error:'此处要求完整日期，请补充日，不自动猜测'};
 if(field.type==='month'&&!/^\d{4}-\d{2}$/.test(value))return {error:'请提供 YYYY-MM 格式日期'};
 if(field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))return {error:'邮箱格式需检查'};
 if(field.maxLength>0&&value.length>field.maxLength)return {error:`内容超过网页 ${field.maxLength} 字限制`};
 return {value};
}
export function aiEndpoint(input){
 let url;try{url=new URL(input);}catch{throw Error('请输入完整服务地址，例如 https://服务域名/v1');}
 if(url.username||url.password||url.search||url.hash)throw Error('服务地址不能包含账号、查询参数或锚点。');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('只允许 HTTPS 服务或本机 localhost。');
 return {url:url.href.replace(/\/$/,'')+'/chat/completions',origin:url.origin+'/*'};
}
