import { sensitive } from './core.js';
import {labelOf,contextInfo,isCustomControl} from './form-dom.js';
// Runs in an isolated content-script world. It never evaluates page text as instructions.
if (!globalThis.__tianyaAgent) {
 globalThis.__tianyaAgent=true;
 let revision='',pageUrl='',registry=new Map(),undo=[],busy=false,cancelled=false;
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const clip=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,180);
 function roots(root,result=[],seen=new Set()){
  if(seen.has(root))return result;seen.add(root);result.push(root);
  for(const el of root.querySelectorAll('*')){
   if(el.shadowRoot)roots(el.shadowRoot,result,seen);
   if(el.tagName==='IFRAME'){try{if(el.contentDocument)roots(el.contentDocument,result,seen);}catch{}}
  }return result;
 }
 const contextOf=el=>contextInfo(el).context;
 const visible=el=>el.isConnected&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';
 function blocked(el,label){
  if(el.disabled||el.readOnly)return '只读或禁用字段';
  if(sensitive(label)||/password|one-time-code/i.test(el.autocomplete))return '敏感信息，请手动填写';
  if(['password','file','checkbox','radio','hidden','submit','button','reset','image','range','color'].includes(el.type))return '附件、选择确认或敏感控件，请手动操作';
  if(isCustomControl(el))return '自定义选择器，请在网页中手动选择；不会写入其内部搜索框';
  if(/^\+\d{1,4}$/.test(label)||/^(男|女)$/.test(label))return '区号或选项文字，请在网页中手动确认';
  return '';
 }
 function scan(){
  if(busy)throw Error('正在填写，请稍后再识别');
  revision=crypto.randomUUID();pageUrl=location.href;registry=new Map();
  let inaccessible=0;const fields=[],groupIds=new Map();
  for(const root of roots(document)){
   for(const frame of root.querySelectorAll('iframe')){try{if(!frame.contentDocument)inaccessible++;}catch{inaccessible++;}}
   for(const el of root.querySelectorAll('input,select,textarea')){
    if(!visible(el)||el.type==='hidden'||['submit','button','reset','image'].includes(el.type))continue;
    if(fields.length>=250)break;
    const id=String(fields.length),label=labelOf(el),reason=blocked(el,label),info=contextInfo(el);
    if(!groupIds.has(info.node))groupIds.set(info.node,`group-${groupIds.size}`);
    registry.set(id,{el,label,context:info.context,sectionNode:info.node,doc:el.ownerDocument,url:el.ownerDocument.location.href});
    fields.push({id,label,context:info.context,groupId:groupIds.get(info.node),type:el.type||el.tagName.toLowerCase(),autocomplete:el.autocomplete||'',hasValue:!reason&&!!el.value.trim(),blocked:reason,maxLength:el.maxLength||-1,options:el.tagName==='SELECT'?Array.from(el.options).map(o=>({value:o.value,label:clip(o.text),disabled:o.disabled})):undefined});
   }
  }
  const counts=new Map();for(const f of fields)counts.set(f.groupId+'|'+f.label,(counts.get(f.groupId+'|'+f.label)||0)+1);
  for(const f of fields)f.repeated=counts.get(f.groupId+'|'+f.label)>1;
  return {revision,url:location.origin+location.pathname,title:document.title,fields,inaccessible,limited:fields.length>=250};
 }
 function valid(ref){return ref&&visible(ref.el)&&ref.el.ownerDocument===ref.doc&&ref.doc.location.href===ref.url&&labelOf(ref.el)===ref.label&&contextOf(ref.el)===ref.context&&contextInfo(ref.el).node===ref.sectionNode&&!blocked(ref.el,ref.label);}
 function setValue(el,value){
  const win=el.ownerDocument.defaultView;
  const proto=el.tagName==='SELECT'?win.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?win.HTMLTextAreaElement.prototype:win.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
  el.dispatchEvent(new win.Event('input',{bubbles:true,composed:true}));
  el.dispatchEvent(new win.Event('change',{bubbles:true,composed:true}));
 }
 async function fill(msg){
  if(busy)throw Error('已有填写任务');
  if(msg.revision!==revision||pageUrl!==location.href)throw Error('页面已变化，请重新识别');
  if(!Array.isArray(msg.items)||msg.items.length>250)throw Error('填写任务无效');
  busy=true;cancelled=false;const results=[];undo=[];
  try{for(const item of msg.items){
   if(cancelled||pageUrl!==location.href)break;
   const ref=registry.get(item.id);
   if(!valid(ref)){results.push({id:item.id,status:'skipped',reason:'控件或页面已变化，请重新识别'});continue;}
   const el=ref.el,value=typeof item.value==='string'?item.value:'';
   if(el.value.trim()){results.push({id:item.id,status:'skipped',reason:'已有内容，未覆盖'});continue;}
   if(!value||value.length>8000||(el.maxLength>0&&value.length>el.maxLength)){results.push({id:item.id,status:'skipped',reason:'内容为空或超长'});continue;}
   if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>!o.disabled&&o.value===value)){results.push({id:item.id,status:'skipped',reason:'选项已变化'});continue;}
   const before=el.value;
   try{
    setValue(el,value);await sleep(130);
    const wrote=el.value===value;
    if(wrote)undo.push({ref,before,value});
    if(wrote&&!el.validity.valid){setValue(el,before);undo.pop();results.push({id:item.id,status:'failed',reason:'未通过网页格式校验，已恢复'});}
    else results.push({id:item.id,status:wrote?'filled':'failed',reason:wrote?'已写入并回读；请检查页面':'网页未接受该值，请手动填写'});
   }catch{results.push({id:item.id,status:'failed',reason:'控件拒绝写入，请手动填写'});}
  }
  // Re-check after the whole batch in case a framework reverted an earlier update.
  await sleep(200);
  for(const result of results)if(result.status==='filled'&&registry.get(result.id)?.el.value!==msg.items.find(i=>i.id===result.id)?.value){result.status='failed';result.reason='网页随后改变了值，请手动检查';}
  return {results,cancelled,undoCount:undo.length};
  }finally{busy=false;}
 }
 async function restore(){
  if(busy)throw Error('请先停止填写');
  if(pageUrl!==location.href)throw Error('页面已变化，无法安全撤销');
  let count=0,skipped=0;
  for(const item of undo){if(valid(item.ref)&&item.ref.el.value===item.value){setValue(item.ref.el,item.before);await sleep(40);if(item.ref.el.value===item.before)count++;else skipped++;}else skipped++;}
  undo=[];return {count,skipped};
 }
 chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(sender.id!==chrome.runtime.id||!msg?.tianya)return;
  const run=async()=>{
   if(msg.type==='ping')return {ready:true};
   if(msg.type==='scan')return scan();
   if(msg.type==='fill')return fill(msg);
   if(msg.type==='undo')return restore();
   if(msg.type==='stop'){cancelled=true;return {stopped:true};}
   throw Error('未知操作');
  };
  run().then(data=>respond({ok:true,data}),error=>respond({ok:false,error:error.message}));return true;
 });
}
