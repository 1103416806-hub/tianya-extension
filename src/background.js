chrome.runtime.onInstalled.addListener(()=>{
 chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
});
chrome.action.onClicked.addListener(tab=>{
 // Opening is kept directly in the user gesture; activeTab comes from this toolbar click.
 chrome.sidePanel.open({windowId:tab.windowId}).catch(()=>{});
 chrome.storage.session.set({targetTab:{id:tab.id,title:tab.title||'当前页面',url:tab.url||''}});
 if(/^https?:/.test(tab.url||''))chrome.scripting.executeScript({target:{tabId:tab.id},files:['agent.js']}).catch(()=>{});
});
chrome.tabs.onRemoved.addListener(async tabId=>{
 const {targetTab}=await chrome.storage.session.get('targetTab');if(targetTab?.id===tabId)await chrome.storage.session.remove('targetTab');
});
