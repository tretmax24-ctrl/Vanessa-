(()=>{
'use strict';
const sb=window.supabaseClient, COUNT_KEY='max.unread.messages.count';
let me=null,channel=null,audioCtx=null,audioReady=false;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const count=()=>parseInt(localStorage.getItem(COUNT_KEY)||'0',10)||0;
const setCount=n=>{n=Math.max(0,Number(n)||0);localStorage.setItem(COUNT_KEY,String(n));renderBadge(n);window.__MAX_UNREAD=n};
const renderBadge=n=>$$('[data-nav="messages"]').forEach(nav=>{let b=nav.querySelector('.max-message-badge');if(!b){b=document.createElement('span');b.className='max-message-badge';nav.appendChild(b)}b.hidden=n<=0;if(n)b.textContent=n>99?'99+':String(n)});
async function user(){if(me)return me;const r=await sb.auth.getUser();if(r.error||!r.data.user)return null;me=r.data.user;return me}
async function prime(){const u=await user();if(!u)return;const baseline=localStorage.getItem('max.messages.baseline');const now=new Date().toISOString();if(baseline){const r=await sb.from('messages').select('id',{count:'exact',head:true}).neq('sender_id',u.id).gt('created_at',baseline);if(!r.error)setCount(r.count||0)}else renderBadge(count());localStorage.setItem('max.messages.baseline',now)}
function unlock(){if(audioReady)return;try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});audioReady=true}catch{}if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{})}
function beep(){if(!audioReady||!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=880;g.gain.setValueAtTime(.0001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.07,audioCtx.currentTime+.01);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.2);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.22)}catch{}}
function notify(){if(document.hidden&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('MAX',{body:'You have a new message',tag:'max-message'});return}catch{}}beep()}
async function subscribe(){const u=await user();if(!u||channel)return;channel=sb.channel('max-unread-message-events').on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{const m=p.new;if(!m||m.sender_id===u.id)return;const conv=document.getElementById('conversation');const active=conv&&!conv.hidden;if(!active){setCount(count()+1);notify()}}).subscribe()}
function clearOnMessages(){document.addEventListener('click',e=>{const nav=e.target.closest?.('[data-nav="messages"]');if(nav)setCount(0)})}
function observe(){const root=document.getElementById('app')||document.body;new MutationObserver(()=>renderBadge(count())).observe(root,{childList:true,subtree:true})}
window.addEventListener('pointerdown',unlock,{once:true,passive:true});window.addEventListener('touchstart',unlock,{once:true,passive:true});window.addEventListener('click',unlock,{once:true,passive:true});window.MAXClearUnreadMessages=()=>setCount(0);
(async()=>{renderBadge(count());observe();clearOnMessages();await prime();await subscribe()})();
})();
