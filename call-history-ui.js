(()=>{
'use strict';
const sb=window.supabaseClient;
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const iconFor=k=>k==='video'?'▣':'☎';
let currentConversationId=null,lastAlertsKey='';
function isMissed(c,me){return c.status==='missed'||(c.status==='ringing'&&!c.answered_at&&((Date.now()-new Date(c.created_at).getTime())>30000)&&c.callee_id===me.id)}
function callLabel(c,me){
 const incoming=c.callee_id===me.id;
 if(isMissed(c,me))return incoming?'Missed call':`Unanswered ${c.kind==='video'?'video':'voice'} call`;
 if(c.status==='declined')return incoming?'Declined call':'Call declined';
 if(c.status==='accepted'&&!c.ended_at)return 'Call connected';
 if(c.status==='ended')return c.answered_at?'Call ended':'Call not answered';
 if(c.status==='ringing')return incoming?'Incoming call':'Calling…';
 return `${c.kind==='video'?'Video':'Voice'} call`;
}
function renderCallEvent(c,me,profiles){
 const incoming=c.callee_id===me.id;
 const peer=profiles?.get(incoming?c.caller_id:c.callee_id);
 const name=peer?.display_name||peer?.username||'User';
 const missed=isMissed(c,me);
 const statusClass=missed?'missed':c.status==='declined'?'declined':c.status==='ringing'?'ringing':'completed';
 return `<div class="call-event ${statusClass}"><span class="call-event-icon">${iconFor(c.kind)}</span><div><b>${esc(callLabel(c,me))}</b><small>${esc(name)} • ${new Date(c.created_at).toLocaleString()}</small></div></div>`;
}
async function fetchCalls(filterConversation){
 const me=window.__MAX_USER|| (await sb.auth.getUser()).data.user;if(!me)return null;
 let q=sb.from('call_sessions').select('id,conversation_id,caller_id,callee_id,kind,status,created_at,answered_at,ended_at').order('created_at',{ascending:false}).limit(100);
 if(filterConversation)q=q.eq('conversation_id',filterConversation);else q=q.or(`caller_id.eq.${me.id},callee_id.eq.${me.id}`);
 const r=await q;if(r.error)return {me,calls:[],profiles:new Map()};
 const ids=[...new Set((r.data||[]).flatMap(c=>[c.caller_id,c.callee_id]))];
 const p=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 return {me,calls:r.data||[],profiles:new Map((p.data||[]).map(x=>[x.id,x]))};
}
async function loadCallHistory(conversationId,el){
 const data=await fetchCalls(conversationId);if(!data||!el)return;
 el.querySelectorAll('.call-history-events').forEach(x=>x.remove());
 if(!data.calls.length)return;
 const holder=document.createElement('div');holder.className='call-history-events';holder.innerHTML=data.calls.slice().reverse().map(c=>renderCallEvent(c,data.me,data.profiles)).join('');
 el.appendChild(holder);
}
async function renderAlertsCalls(){
 const page=document.querySelector('.simple-page');if(!page)return;
 const data=await fetchCalls();if(!data)return;
 const key=data.calls.map(c=>`${c.id}:${c.status}:${c.ended_at||''}`).join('|');if(key===lastAlertsKey)return;lastAlertsKey=key;
 let section=document.getElementById('maxCallHistoryAlerts');
 if(!section){section=document.createElement('section');section.id='maxCallHistoryAlerts';section.className='call-history-alerts';page.appendChild(section)}
 section.innerHTML=`<div class="call-history-heading"><span class="kicker">CALLS</span><h2>Call history</h2></div>${data.calls.length?data.calls.map(c=>renderCallEvent(c,data.me,data.profiles)).join(''):'<div class="profile-empty">No calls yet.</div>'}`;
}
function attach(){
 const interval=setInterval(()=>{
  const conv=document.getElementById('conversation');
  const msg=document.getElementById('chatMessages');
  const id=window.activeConversationId;
  if(conv&&msg&&id&&!conv.hidden&&id!==currentConversationId){currentConversationId=id;loadCallHistory(id,msg)}
  if(document.querySelector('.simple-page'))renderAlertsCalls();
 },700);
 window.addEventListener('beforeunload',()=>clearInterval(interval));
}
window.MAXLoadCallHistory=loadCallHistory;
attach();
})();
