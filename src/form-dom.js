import {contextSection,fieldName} from './core.js';
const clean=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,180);
function labelText(node){
 if(!node)return '';
 const copy=node.cloneNode(true);
 copy.querySelectorAll('input,select,textarea,button,[role="combobox"],[role="listbox"],.atsx-select,.ant-select').forEach(el=>el.remove());
 return clean(copy.textContent);
}
export function labelOf(el){
 const root=el.getRootNode();
 const aria=(el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(id=>labelText(root.getElementById?.(id))).join(' ');
 const containerSelector='.atsx-form-item,.ant-form-item,.form-item,.form-field';
 const container=el.closest(containerSelector);
 const labels=container?[...container.querySelectorAll('.atsx-form-item-label,.ant-form-item-label,label')].filter(node=>node.closest(containerSelector)===container):[];
 const labelValues=[...new Set(labels.map(labelText).filter(Boolean))];
 const containerLabel=labelValues.length===1?labelValues[0]:'';
 let label=clean(el.getAttribute('aria-label')||aria||containerLabel||labelText(el.labels?.[0])||el.getAttribute('placeholder')||el.getAttribute('name')||el.id||'未命名字段').replace(/\s*[*必填]+$/,'').trim();
 // A range label alone cannot distinguish its two inputs. Only explicit child
 // placeholders provide the missing start/end meaning; never infer by position.
 if(['起止时间','起止日期'].includes(fieldName(label))){
  const hint=fieldName(el.getAttribute('placeholder'));
  if(['开始时间','开始日期'].includes(hint))label='开始时间';
  if(['结束时间','结束日期'].includes(hint))label='结束时间';
 }
 return label;
}
export function contextInfo(el){
 const known=value=>contextSection(value)||/^(基本信息|申请信息|自我评价)$/.test(clean(value));
 for(let node=el.parentElement,depth=0;node&&node.tagName!=='BODY'&&depth<12;node=node.parentElement,depth++){
  const aria=node.getAttribute('aria-label');
  if(known(aria))return {node,context:clean(aria)};
  const candidates=[...node.children].flatMap(child=>child.matches('legend,h1,h2,h3,h4,[role="heading"],.section-title')?[child]:[...child.children].filter(n=>n.matches('h1,h2,h3,h4,[role="heading"],.section-title')));
  const headings=candidates.filter(n=>known(n.textContent));
  if(headings.length===1)return {node,context:clean(headings[0].textContent)};
  if(node.matches('fieldset,[role="group"]'))return {node,context:clean(aria||node.querySelector('legend')?.textContent)};
 }
 return {node:el.ownerDocument.body,context:''};
}
export function isCustomControl(el){
 return !!el.closest('[role="combobox"],.atsx-select,.ant-select,.atsx-picker,.ant-picker,.atsx-calendar-picker,.ant-calendar-picker')||!!el.getAttribute('aria-autocomplete')||el.hasAttribute('list');
}
