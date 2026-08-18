(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const iconFor=k=>k==='video'?'▣':'☎';
let currentConversationId=null;
function formatCallText(c,me){
 const incoming=c.callee_id===me.id, missed=c.status==='ringing' || c.status==='missed';
 if(missed&&incoming)return `Missed ${c.kind==='video'?'video':'voice'} call`;
 if(c.status==='declined')return `${incoming?'You declined':'Call declined'} • ${c.kind==='video'?'Video':'Voice'} call`;
 if(c.status==='ended')return `${c.kind==='video'?'Video':'Voice'} call`;
 return `${c.kind==='video'?'Video':'Voice'} call`;
}
function renderCallEvent(c,me,profiles){
 const incoming=c.callee_id===me.id;
 const missed=(c.status==='missed')||(c.status==='ringing'&&!c.answered_at);
 const name=profiles?.get(incoming?c.caller_id:c.callee_id)?.display_name||profiles?.get(incoming?c.caller_id:c.callee_id)?.username||'User';
 const statusClass=missed&&incoming?'missed':c.status==='declined'?'declined':'completed';
 return `<div class="call-event ${statusClass}"><span class="call-event-icon">${iconFor(c.kind)}</span><div><b>${esc(formatCallText(c,me))}</b><small>${esc(name)} • ${new Date(c.created_at).toLocaleString()}</small></div></div>`;
}
async function loadCallHistory(conversationId,el){
 const me=window.__MAX_USER|| (await sb.auth.getUser()).data.user;if(!me||!conversationId||!el)return;
 const r=await sb.from('call_sessions').select('id,conversation_id,caller_id,callee_id,kind,status,created_at,answered_at,ended_at').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(100);
 if(r.error)return;
 const ids=[...new Set((r.data||[]).flatMap(c=>[c.caller_id,c.callee_id]))];
 const p=ids.length?await sb.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
 const pm=new Map((p.data||[]).map(x=>[x.id,x]));
 const items=(r.data||[]).map(c=>renderCallEvent(c,me,pm)).join('');
 if(!items)return;
 const holder=document.createElement('div');holder.className='call-history-events';holder.innerHTML=items;
 el.querySelectorAll('.call-history-events').forEach(x=>x.remove());
 el.appendChild(holder);
 el.scrollTop=el.scrollHeight;
}
function attach(){
 const interval=setInterval(()=>{
  const conv=document.getElementById('conversation');
  const msg=document.getElementById('chatMessages');
  const id=window.activeConversationId;
  if(!conv||!msg||!id||conv.hidden)return;
  if(id!==currentConversationId){currentConversationId=id;loadCallHistory(id,msg)}
 },500);
 window.addEventListener('beforeunload',()=>clearInterval(interval));
}
window.MAXLoadCallHistory=loadCallHistory;
attach();
})();
