(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
async function enhanceProfile(){
  const page=$('.profile-page');
  if(!page)return;
  page.classList.add('profile-enhanced');
  const edit=$('#editProfile');
  if(edit&&!edit.dataset.polished){edit.dataset.polished='1';edit.textContent='Edit profile';}
  const stats=$$('.profile-stats>div',page);
  if(!stats.length)return;
  const posts=await sb.from('posts').select('id').eq('author_id',window.__MAX_USER?.id||'');
  if(posts.error)return;
  const ids=(posts.data||[]).map(p=>p.id);
  let likes=0;
  if(ids.length){const r=await sb.from('post_likes').select('post_id',{count:'exact',head:true}).in('post_id',ids);if(!r.error)likes=r.count||0;}
  const followingStat=[...stats].find(x=>(x.textContent||'').includes('Following'));
  if(followingStat&&followingStat.previousElementSibling){
    const followerStat=followingStat.previousElementSibling;
    const existing=page.querySelector('.likes-stat');
    if(!existing){
      const el=document.createElement('div');el.className='likes-stat';el.innerHTML=`<b>${likes}</b><span>Likes</span>`;
      followerStat.parentNode.insertBefore(el,followingStat);
    }else{const b=existing.querySelector('b');if(b)b.textContent=likes;}
  }
  page.querySelectorAll('.profile-grid .grid-item').forEach((el,i)=>{el.classList.add('profile-media-card');el.setAttribute('aria-label',`Post ${i+1}`)});
}
const mo=new MutationObserver(()=>setTimeout(enhanceProfile,60));
mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
enhanceProfile();
})();