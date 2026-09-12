import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
function Practice(){
 const [name,setName]=useState(''),[submitted,setSubmitted]=useState(false);
 const open=async()=>{const tab=await chrome.tabs.getCurrent();await chrome.storage.session.set({targetTab:{id:tab.id,title:'填呀安全练习页',url:tab.url}});await chrome.tabs.create({url:chrome.runtime.getURL('panel.html')});};
 return <div className="practice-shell"><header className="brandbar"><div className="brand"><span className="mark">填</span>填呀 <small>安全练习页</small></div><span>LOCAL PRACTICE</span></header><main className="practice-main"><div className="page-heading"><h1>先试填一次，再去认真投递。</h1><p>这里是本地测试表单，不属于任何企业，不会向外发送信息。</p></div><div className="note"><strong>试用步骤</strong><p>1. 点击下方按钮打开填呀 →「我的简历」→「载入示例」。<br/>2. 到「填当前页」识别、核对，然后确认填写。<br/>3. 回到这里查看结果，再试试撤销。</p><button className="primary" onClick={open}>打开填写面板 →</button></div><form onSubmit={e=>{e.preventDefault();setSubmitted(true);}}>
 <fieldset><legend>基本信息</legend><label className="form-field">姓名<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><p className="hint" id="react-value">React 已接收：{name||'尚未填写'}</p><label className="form-field">手机号码<input type="tel"/></label><label className="form-field">电子邮箱<input type="email"/></label><label className="form-field">现居城市<input defaultValue="此项已有内容，请保留"/></label><label className="form-field">自我介绍<textarea rows="3"/></label></fieldset>
 <fieldset><legend>教育经历</legend><label className="form-field">学校<input/></label><label className="form-field">专业<input/></label><label className="form-field">学历<select defaultValue=""><option value="">请选择学历</option><option value="bachelor">本科</option><option value="master">硕士研究生</option><option value="phd">博士</option></select></label><label className="form-field">开始日期<input type="month"/></label><label className="form-field">结束日期<input type="date"/></label><p className="hint">示例只提供毕业月份，这里的完整日期应当留空，不应猜测具体哪一天。</p></fieldset>
 <fieldset><legend>实习经历</legend><label className="form-field">公司名称<input/></label><label className="form-field">职位<input/></label><label className="form-field">工作内容<textarea rows="3"/></label></fieldset>
 <fieldset><legend>需要你亲自处理</legend><label className="form-field">身份证号码<input/></label><label className="form-field">验证码<input autoComplete="one-time-code"/></label><label className="form-field">简历附件<input type="file"/></label><label className="check-row"><input type="checkbox"/><span>我同意隐私协议（仅展示，不应自动勾选）</span></label></fieldset>
 <button className="secondary" type="submit">检查练习表单（不会投递）</button>{submitted&&<p role="status">你手动点击了检查。没有发生真实投递。</p>}
 </form></main></div>;
}
createRoot(document.getElementById('root')).render(<Practice/>);
