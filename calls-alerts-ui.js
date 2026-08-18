(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const icon=k=>k==='video'?'▣':'☎';
const label=k=>k==='video'?'Video call':'Voice call';
function state(c,me){
 const incoming=c.callee_id===me.id;
 if(c.status==='declined') return incoming?'Declined':'Declined by recipient';
 if(c.status==='ended'&&c.answered_at) return 'Completed';
 if(c.status==='ringing'&&!c.answered_at) return incoming?'Missed':'No answer';
 if(c.status==='accepted'||c.answered_at) return 'Completed';
 return c.status||'Call';
}
async function loadCalls(){
 const me=window.__MAX_USER|| (await sb.auth.getUser()).data.user;
 const host=$('#callsPanel');
 if(!me||!host)return;
 const r=await sb.from('call_sessions').select('id,caller_id,callee_id,kind,status,created_at,answered_at,ended_at').or(`caller_id.eq.${me.id},callee_id.eq.${me.id}`).order('created_at',{ascending:false}).limit(100);
 if(r.error){host.innerHTML=`<div class="calls-empty">${esc(r.error.message)}</div>`;return}
 const rows=r.data||[];
 if(!rows.length){host.innerHTML='<div class="calls-empty">No calls yet.</div>';return}
 const ids=[...new Set(rows.flatMap(c=>[c.caller_id,c.callee_id]))];
 const p=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 const pm=new Map((p.data||[]).map(x=>[x.id,x]));
 host.innerHTML=rows.map(c=>{
  const incoming=c.callee_id===me.id;
  const other=pm.get(incoming?c.caller_id:c.callee_id)||{};
  const missed=c.status==='ringing'&&!c.answered_at&&incoming;
  return `<article class="call-history-row ${missed?'missed':''}"><div class="call-history-icon">${icon(c.kind)}</div><div class="call-history-main"><strong>${esc(other.display_name||other.username||'User')}</strong><span>${esc(state(c,me))} · ${esc(label(c.kind))}</span></div><time>${new Date(c.created_at).toLocaleString()}</time></article>`;
 }).join('');
}
function install(){
 const page=$('.simple-page');
 if(!page)return;
 if($('#callsTab',page))return;
 const header=$('.page-header',page); if(!header)return;
 const tabs=document.createElement('div');tabs.className='alerts-tabs';tabs.innerHTML='<button class="alerts-tab active" id="alertsTab">Activity</button><button class="alerts-tab" id="callsTab">Calls</button>';header.parentNode.insertBefore(tabs,header.nextSibling);
 const activity=$('.activity-list',page); if(!activity)return;
 const calls=document.createElement('section');calls.id='callsPanel';calls.className='calls-panel';calls.hidden=true;activity.parentNode.insertBefore(calls,activity.nextSibling);
 $('#alertsTab',page).onclick=()=>{calls.hidden=true;activity.hidden=false;$('#alertsTab',page).classList.add('active');$('#callsTab',page).classList.remove('active')};
 $('#callsTab',page).onclick=()=>{activity.hidden=true;calls.hidden=false;$('#callsTab',page).classList.add('active');$('#alertsTab',page).classList.remove('active');loadCalls()};
}
const mo=new MutationObserver(()=>install());mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});install();
window.MAXLoadCalls=loadCalls;
})();
