(()=>{
'use strict';
const sb=window.supabaseClient;
const KEY='max.read.conversation.';
let me=null, channel=null, audioCtx=null, audioReady=false;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

async function user(){
  if(me)return me;
  const r=await sb.auth.getUser();
  if(r.error||!r.data.user)return null;
  me=r.data.user; return me;
}
function readAt(id){return localStorage.getItem(KEY+id)||'1970-01-01T00:00:00.000Z'}
function markRead(id,when){if(id&&when)localStorage.setItem(KEY+id,when)}
function unlock(){
  if(audioReady)return;
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    audioReady=true;
  }catch{}
}
function beep(){
  if(!audioReady||!audioCtx)return;
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.0001,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.08,audioCtx.currentTime+.01);
    g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.22);
    o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.24);
  }catch{}
}
async function notification(text){
  if(document.hidden && 'Notification' in window && Notification.permission==='granted'){
    try{new Notification('MAX',{body:text||'New message',tag:'max-message'});return}catch{}
  }
  beep();
}
function ensureBadges(){
  $$('[data-nav="messages"]').forEach(nav=>{
    if(!nav.querySelector('.max-message-badge')){
      const b=document.createElement('span');b.className='max-message-badge';nav.appendChild(b)
    }
  });
}
function setGlobalBadge(n){
  $$('[data-nav="messages"]').forEach(nav=>{
    const b=nav.querySelector('.max-message-badge');if(!b)return;
    if(n>0){b.hidden=false;b.textContent=n>99?'99+':String(n)}else b.hidden=true;
  });
}
async function unreadRows(){
  const u=await user();if(!u)return [];
  const cm=await sb.from('conversation_members').select('conversation_id').eq('user_id',u.id);
  if(cm.error)return [];
  const ids=(cm.data||[]).map(x=>x.conversation_id); if(!ids.length)return [];
  const msgs=await sb.from('messages').select('conversation_id,sender_id,created_at').in('conversation_id',ids).neq('sender_id',u.id).order('created_at',{ascending:false}).limit(500);
  if(msgs.error)return [];
  return (msgs.data||[]).filter(m=>new Date(m.created_at)>new Date(readAt(m.conversation_id)));
}
async function refresh(){
  const rows=await unreadRows();
  setGlobalBadge(rows.length);
  const counts={};
  rows.forEach(r=>counts[r.conversation_id]=(counts[r.conversation_id]||0)+1);
  $$('.person-row').forEach(row=>{
    const btn=row.querySelector('[data-person]');
    const id=btn?.dataset.person; if(!id)return;
    const badge=row.querySelector('.message-unread-badge');
    const conv=row.dataset.conversationId;
    if(!badge)return;
    const n=conv?counts[conv]||0:0;
    badge.hidden=!n; if(n)badge.textContent=n>99?'99+':String(n);
  });
  window.__MAX_UNREAD=rows.length;
}
async function decoratePeople(){
  const list=$('#peopleList');if(!list)return;
  const u=await user();if(!u)return;
  const cm=await sb.from('conversation_members').select('conversation_id').eq('user_id',u.id);
  if(cm.error)return;
  const mine=(cm.data||[]).map(x=>x.conversation_id);if(!mine.length)return;
  const members=await sb.from('conversation_members').select('conversation_id,user_id').in('conversation_id',mine);
  if(members.error)return;
  const otherByConv={};
  (members.data||[]).forEach(x=>{if(x.user_id!==u.id)otherByConv[x.conversation_id]=x.user_id});
  const convByOther={};Object.entries(otherByConv).forEach(([c,p])=>convByOther[p]=c);
  $$('.person-row').forEach(row=>{
    const person=row.querySelector('[data-person]')?.dataset.person; const conv=convByOther[person];
    if(conv)row.dataset.conversationId=conv;
    let badge=row.querySelector('.message-unread-badge');
    if(!badge){badge=document.createElement('span');badge.className='message-unread-badge';badge.hidden=true;row.appendChild(badge)}
  });
}
function observeApp(){
  const mo=new MutationObserver(()=>{ensureBadges();decoratePeople().then(refresh).catch(()=>{})});
  mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
}
function watchMessages(){
  user().then(u=>{
    if(!u||channel)return;
    channel=sb.channel('max-unread-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},async p=>{
      const m=p.new;if(!m||m.sender_id===u.id)return;
      const current=document.getElementById('conversation');
      const same=window.__MAX_CHAT_CONVERSATION_ID && window.__MAX_CHAT_CONVERSATION_ID===m.conversation_id && current && !current.hidden;
      if(!same){await notification(m.content?'New message':'New message')}
      await refresh();
    }).subscribe();
  });
}
function patchConversationHooks(){
  const original=window.openConversation;
  if(typeof original!=='function')return setTimeout(patchConversationHooks,300);
  if(original.__maxUnreadPatched)return;
  const wrapped=async function(...args){const out=await original.apply(this,args);setTimeout(async()=>{
    const id=window.__MAX_CHAT_CONVERSATION_ID;
    if(id){const r=await sb.from('messages').select('created_at').eq('conversation_id',id).order('created_at',{ascending:false}).limit(1);if(!r.error&&r.data?.[0])markRead(id,r.data[0].created_at);await refresh();}
  },50);return out};wrapped.__maxUnreadPatched=true;window.openConversation=wrapped;
}
window.addEventListener('pointerdown',unlock,{once:true,passive:true});
window.addEventListener('click',unlock,{once:true,passive:true});
ensureBadges();observeApp();watchMessages();patchConversationHooks();
window.MAXMarkConversationRead=async(id,when)=>{if(id){markRead(id,when||new Date().toISOString());await refresh()}};
window.MAXRefreshUnread=refresh;
})();
