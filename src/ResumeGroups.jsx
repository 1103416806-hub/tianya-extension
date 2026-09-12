import React from 'react';
import {groups,classifyLegacy} from './core.js';

export function ResumeGroups({profile,onChange}){
 return <div className="resume-groups">{Object.entries(groups).filter(([section])=>section!=='experience'||profile.experience.length).map(([section,g])=><details className="experience-group resume-section" key={section} open={profile[section].length>0||undefined}>
  <summary><strong>{g.title}</strong><span>{profile[section].length} 条</span></summary>
  {section==='experience'&&<p className="note warning">旧版资料已保留，不会猜测是工作还是实习。请将每条归类后再填写对应表单。</p>}
  {!profile[section].length&&<p className="hint">尚未提供。按实际经历添加，没有则留空。</p>}
  {profile[section].map((item,index)=><fieldset className="record" key={index}><legend>{g.title} {index+1}</legend>
   {g.fields.map(([key,label])=><label className="form-field" key={key}>{label}{key==='description'?<textarea value={item[key]||''} rows="4" onChange={e=>onChange({...profile,[section]:profile[section].map((x,i)=>i===index?{...x,[key]:e.target.value}:x)})}/>:<input value={item[key]||''} placeholder={key==='awardDate'?'如实填写：YYYY 或 YYYY-MM':key.includes('Date')?'YYYY-MM 或 YYYY-MM-DD':key==='url'?'https://…':''} onChange={e=>onChange({...profile,[section]:profile[section].map((x,i)=>i===index?{...x,[key]:e.target.value}:x)})}/>}</label>)}
   {section==='experience'&&<div className="two-buttons">{[['employment','移入工作经历'],['internships','移入实习经历']].map(([target,label])=><button type="button" className="secondary" key={target} disabled={profile[target].length>=10} onClick={()=>onChange(classifyLegacy(profile,index,target))}>{label}</button>)}</div>}
   <button className="danger-link" onClick={()=>{if(confirm('移除这条资料？'))onChange({...profile,[section]:profile[section].filter((_,i)=>i!==index)});}}>移除此经历</button>
  </fieldset>)}
  {section!=='experience'&&<button className="text-button" aria-label={`添加${g.title}`} disabled={profile[section].length>=10} onClick={()=>onChange({...profile,[section]:[...profile[section],Object.fromEntries(g.fields.map(([k])=>[k,'']))]})}>＋ 添加{g.title}</button>}
 </details>)}</div>;
}
