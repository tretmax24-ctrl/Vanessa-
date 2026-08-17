(()=>{
'use strict';
const sb=window.supabaseClient;
const app=document.getElementById('app');
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
let me=null, activeOther=null, markTimer=null;

async function currentUser(){
  if(me)return me;
  const {data,error}=await sb.auth.getUser();
  if(error||!data.user)return null;
  me=data.user;
  return me;
}

function addBadge(el,count){
  if(!el)return;
  let b=el.querySelector('.max-unread-badge');
  if(!count){if(b)b.remove();return;}
  if(!b){b=document.createElement('span');b.className='max-unread-badge';el.appendChild(b);}
  b.textContent=count>99?'99+':String(count);
}

async function unreadState(){
  const u=await currentUser();
  if(!u)return {total:0,byUser:new Map()};
  const cm=await sb.from('conversation_members').select('conversation_id,user_id,last_read_at').eq('user_id',u.id);
  if(cm.error)return {total:0,byUser:new Map()};
  const memberships=cm.data||[];
  const ids=memberships.map(x=>x.conversation_id);
  if(!ids.length)return {total:0,byUser:new Map()};
  const others=await sb.from('conversation_members').select('conversation_id,user_id').in('conversation_id',ids).neq('user_id',u.id);
  if(others.error)return {total:0,byUser:new Map()};
  const otherByConv=new Map((others.data||[]).map(x=>[x.conversation_id,x.user_id]));
  const messages=await sb.from('messages').select('conversation_id,sender_id,created_at').in('conversation_id',ids).order('created_at',{ascending:true});
  if(messages.error)return {total:0,byUser:new Map()};
  const readByConv=new Map(memberships.map(x=>[x.conversation_id,x.last_read_at?new Date(x.last_read_at).getTime():0]));
  const byUser=new Map();
  let total=0;
  for(const m of messages.data||[]){
    if(m.sender_id===u.id)continue;
    const last=readByConv.get(m.conversation_id)||0;
    if(new Date(m.created_at).getTime()<=last)continue;
    const other=otherByConv.get(m.conversation_id); if(!other)continue;
    byUser.set(other,(byUser.get(other)||0)+1); total++;
  }
  return {total,byUser};
}

async function refreshUnreadBadges(){
  const state=await unreadState();
  $$('[data-nav="messages"]').forEach(x=>addBadge(x,state.total));
  for(const row of $$('.person-row')){
    const id=$('[data-person]',row)?.dataset.person;
    if(!id)continue;
    addBadge(row,state.byUser.get(id)||0);
  }
}

async function findConversation(otherId){
  const u=await currentUser(); if(!u||!otherId)return null;
  const mine=await sb.from('conversation_members').select('conversation_id').eq('user_id',u.id);
  if(mine.error)return null;
  const ids=(mine.data||[]).map(x=>x.conversation_id);
  if(!ids.length)return null;
  const theirs=await sb.from('conversation_members').select('conversation_id').eq('user_id',otherId).in('conversation_id',ids);
  if(theirs.error||!theirs.data?.length)return null;
  return theirs.data[0].conversation_id;
}

async function markRead(otherId){
  const u=await currentUser();
  if(!u||!otherId||otherId===u.id)return;
  const conversationId=await findConversation(otherId);
  if(!conversationId)return;
  await sb.from('conversation_members').update({last_read_at:new Date().toISOString()}).eq('conversation_id',conversationId).eq('user_id',u.id);
  await refreshUnreadBadges();
  await decorateReceipts(conversationId);
}

async function decorateReceipts(conversationId){
  const el=$('#chatMessages'); if(!el)return;
  const u=await currentUser(); if(!u)return;
  const members=await sb.from('conversation_members').select('user_id,last_read_at').eq('conversation_id',conversationId);
  if(members.error)return;
  const other=(members.data||[]).find(x=>x.user_id!==u.id);
  const otherRead=other?.last_read_at?new Date(other.last_read_at).getTime():0;
  const rows=await sb.from('messages').select('id,sender_id,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(300);
  if(rows.error)return;
  const sent=(rows.data||[]).filter(x=>x.sender_id===u.id);
  const bubbles=$$('.bubble.mine',el);
  const offset=Math.max(0,bubbles.length-sent.length);
  sent.forEach((m,i)=>{
    const bubble=bubbles[offset+i]; if(!bubble)return;
    let tick=$('.read-receipt',bubble);
    if(!tick){tick=document.createElement('span');tick.className='read-receipt';bubble.appendChild(tick)}
    const read=otherRead && new Date(m.created_at).getTime()<=otherRead;
    tick.textContent=read?'✓✓':'✓';
    tick.classList.toggle('seen',!!read);
    tick.title=read?'Read':'Delivered';
  });
}

function hookClicks(){
  document.addEventListener('click',e=>{
    const p=e.target.closest?.('[data-person]');
    if(!p)return;
    activeOther=p.dataset.person||null;
    clearTimeout(markTimer);
    markTimer=setTimeout(()=>markRead(activeOther),350);
  },true);
}

function hookDom(){
  if(!app)return;
  const mo=new MutationObserver(()=>{
    refreshUnreadBadges().catch(()=>{});
    if(activeOther){findConversation(activeOther).then(id=>{if(id)decorateReceipts(id)}).catch(()=>{});}
  });
  mo.observe(app,{childList:true,subtree:true});
}

function hookRealtime(){
  sb.channel('max-message-read-ui')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>{
      refreshUnreadBadges().catch(()=>{});
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'conversation_members'},payload=>{
      refreshUnreadBadges().catch(()=>{});
      if(activeOther)findConversation(activeOther).then(id=>{if(id)decorateReceipts(id)}).catch(()=>{});
    })
    .subscribe();
}

(async()=>{
  if(!app)return;
  const u=await currentUser(); if(!u)return;
  hookClicks();hookDom();hookRealtime();refreshUnreadBadges();
})();
})();
