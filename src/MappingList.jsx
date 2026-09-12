import React from 'react';
import {contextSection,mappedValue} from './core.js';

export function MappingList({rows,setRows,profile,allFacts,busy,results,bindings,onBind}){
 const grouped=new Map();
 for(const row of rows){const id=row.groupId||row.context||'other';if(!grouped.has(id))grouped.set(id,{id,context:row.context,rows:[]});grouped.get(id).rows.push(row);}
 return <div className="mapping-list">{[...grouped.values()].map((group,index)=>{
  const section=contextSection(group.context),records=profile[section]||[];
  return <section className="mapping-group" aria-label={`${group.context||'其他字段'} · 页面分组 ${index+1}`} key={group.id}>
   <div className="mapping-group-heading"><strong>{group.context||'其他字段'}</strong><span>{group.rows.length} 项</span></div>
   {section&&records.length>1&&<div className="group-binding"><label className="form-field">这一组使用哪条资料？<select aria-label="整组使用的资料" value={bindings[group.id]??''} disabled={!!busy} onChange={e=>onBind(group.id,e.target.value)}><option value="">请选择，不会按网页顺序猜测</option>{records.map((record,i)=><option key={i} value={i}>{i+1} · {record.school||record.company||record.name||record.language||record.platform||record.url||'未命名资料'}</option>)}</select></label><p className="hint">选一次即可对应这一组的字段；已有内容不会覆盖。仍需核对每项结果。</p></div>}
   {group.rows.map(row=>{const fact=allFacts.find(f=>f.key===row.key),mapped=mappedValue(row,fact?.value),result=results[row.id];return <div className={'mapping '+(row.blocked?'blocked':'')+(result?.status==='filled'?' success':'')} key={row.id}><div className="mapping-head"><label><input aria-label={`选择填写 ${row.label}`} type="checkbox" checked={row.selected} disabled={!!busy||!!row.blocked||row.hasValue||!!mapped.error} onChange={e=>setRows(rows.map(r=>r.id===row.id?{...r,selected:e.target.checked}:r))}/><strong>{row.label}</strong></label><span>{result?.status==='filled'?'已填写':row.hasValue?'保留原值':row.blocked?'手动处理':row.selected?'待填写':'未选择'}</span></div>
    {!row.blocked&&!row.hasValue&&<><select aria-label={`${row.label}对应的简历字段`} value={row.key} disabled={!!busy} onChange={e=>{const key=e.target.value;const m=mappedValue(row,allFacts.find(f=>f.key===key)?.value);setRows(rows.map(r=>r.id===row.id?{...r,key,selected:!!key&&!m.error}:r));}}><option value="">请选择简历中的对应信息</option>{allFacts.map(f=><option key={f.key} value={f.key}>{f.label}</option>)}</select>{fact&&<div className="proposed">{mapped.display||fact.value}</div>}</>}
    <p className={'mapping-reason '+(result?.status==='failed'?'error-text':'')}>{result?.reason||row.blocked||(row.hasValue?'此项已有内容，插件不会覆盖。':mapped.error&&row.key?mapped.error:row.reason)}</p></div>;})}
  </section>;
 })}</div>;
}
