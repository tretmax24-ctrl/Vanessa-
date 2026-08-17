(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let me=null, timer=null, channel=null, busy=false, activeOther=null;

async function user(){
  if(me)return me;
  const r=await sb.auth.getUser(); if(r.error||!r.data.user)return null;
  me=r.data.user; return me;
}
function badge(el,n){
  if(!el)return;
  let b=el.querySelector('.max-chat-badge');
  if(!n){if(b)b.remove();return;}
  if(!b){b=document.createElement('span');b.className='max-chat-badge';el.appendChild(b)}
  b.textContent=n>99?'99+':String(n);
}
async function state(){
  const u=await user(); if(!u)return {total:0,byUser:new Map()};
  const cm=await sb.from('conversation_members').select('conversation_id,user_id,last_read_at').eq('user_id',u.id);
  if(cm.error||!cm.data?.length)return {total:0,byUser:new Map()};
  const ids=cm.data.map(x=>x.conversation_id);
  const oth=await sb.from('conversation_members').select('conversation_id,user_id').in('conversation_id',ids).neq('user_id',u.id);
  if(oth.error)return {total:0,byUser:new Map()};
  const byConv=new Map((oth.data||[]).map(x=>[x.conversation_id,x.user_id]));
  const rows=await sb.from('messages').select('conversation_id,sender_id,created_at').in('conversation_id',ids);
  if(rows.error)return {total:0,byUser:new Map()};
  const read=new Map(cm.data.map(x=>[x.conversation_id,x.last_read_at?Date.parse(x.last_read_at):0]));
  const byUser=new Map(); let total=0;
  for(const m of rows.data||[]){
    if(m.sender_id===u.id)continue;
    if(Date.parse(m.created_at)<= (read.get(m.conversation_id)||0))continue;
    const other=byConv.get(m.conversation_id); if(!other)continue;
    byUser.set(other,(byUser.get(other)||0)+1); total++;
  }
  return {total,byUser};
}
async function refresh(){
  if(busy)return; busy=true;
  try{
    const s=await state();
    $$('[data-nav="messages"]').forEach(x=>badge(x,s.total));
    for(const row of $$('.person-row')){
      const id=$('[data-person]',row)?.dataset.person;
      if(id)badge(row,s.byUser.get(id)||0);
    }
  }catch(e){ console.warn('MAX message status:',e) }
  finally{busy=false}
}
async function findConv(other){
  const u=await user(); if(!u||!other)return null;
  const mine=await sb.from('conversation_members').select('conversation_id').eq('user_id',u.id);
  if(mine.error||!mine.data?.length)return null;
  const ids=mine.data.map(x=>x.conversation_id);
  const theirs=await sb.from('conversation_members').select('conversation_id').eq('user_id',other).in('conversation_id',ids);
  return theirs.data?.[0]?.conversation_id||null;
}
async function markRead(other){
  const u=await user(); if(!u||!other)return;
  const id=await findConv(other); if(!id)return;
  await sb.from('conversation_members').update({last_read_at:new Date().toISOString()}).eq('conversation_id',id).eq('user_id',u.id);
  await refresh();
  await receipts(id);
}
async function receipts(conv){
  const u=await user(); const box=$('#chatMessages'); if(!u||!box||!conv)return;
  const mem=await sb.from('conversation_members').select('user_id,last_read_at').eq('conversation_id',conv);
  if(mem.error)return;
  const other=mem.data?.find(x=>x.user_id!==u.id); const seenAt=other?.last_read_at?Date.parse(other.last_read_at):0;
  const ms=await sb.from('messages').select('id,sender_id,created_at').eq('conversation_id',conv).order('created_at');
  if(ms.error)return;
  const sent=(ms.data||[]).filter(x=>x.sender_id===u.id); const bubbles=$$('.bubble.mine',box); const off=Math.max(0,bubbles.length-sent.length);
  sent.forEach((m,i)=>{const b=bubbles[off+i];if(!b)return;let t=$('.max-read-tick',b);if(!t){t=document.createElement('span');t.className='max-read-tick';b.appendChild(t)}const seen=seenAt&&Date.parse(m.created_at)<=seenAt;t.textContent=seen?'✓✓':'✓';t.classList.toggle('seen',!!seen)});
}
function detectConversation(){
  const head=$('#chatName');
  if(!head)return null;
  const rows=$$('.person-row');
  const match=rows.find(r=>!r.hidden && r.classList.contains('selected'));
  if(match)return $('[data-person]',match)?.dataset.person||null;
  return activeOther;
}
function watchConversationClicks(){
  document.addEventListener('click',e=>{
    const p=e.target.closest?.('[data-person]');
    if(!p)return;
    activeOther=p.dataset.person||null;
    setTimeout(async()=>{ if(activeOther) await markRead(activeOther) },200);
  },true);
}
function subscribe(){
  const u=me; if(!u||channel)return;
  channel=sb.channel('max-message-status')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},()=>refresh())
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'conversation_members'},()=>refresh())
    .subscribe(status=>{if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('MAX message status realtime unavailable')});
}
(async()=>{
  const u=await user(); if(!u)return;
  watchConversationClicks();
  await refresh();
  subscribe();
  timer=setInterval(refresh,12000);
  window.addEventListener('beforeunload',()=>{if(timer)clearInterval(timer);if(channel)sb.removeChannel(channel)},{once:true});
})();
})();
