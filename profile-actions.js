(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const initial=v=>(String(v||'M').trim().charAt(0).toUpperCase()||'M');

async function uploadAvatar(file){
  if(!file||!file.type.startsWith('image/')) throw new Error('Choose an image.');
  if(file.size>8*1024*1024) throw new Error('Profile photo must be 8 MB or smaller.');
  const u=window.__MAX_USER; if(!u) throw new Error('Please sign in again.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${u.id}/avatar-${crypto.randomUUID()}.${ext}`;
  const up=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
  if(up.error)throw up.error;
  return sb.storage.from('post-media').getPublicUrl(path).data.publicUrl;
}

async function updateAvatar(file){
  const url=await uploadAvatar(file);
  const r=await sb.from('profiles').update({avatar_url:url}).eq('id',window.__MAX_USER.id);
  if(r.error)throw r.error;
  window.__MAX_AVATAR_URL=url;
  return url;
}

function addAvatarEditor(){
  const page=$('.profile-page'); if(!page||$('.profile-avatar-action',page))return;
  const avatar=page.querySelector('.profile-avatar-large'); if(!avatar)return;
  const wrap=document.createElement('button');
  wrap.type='button'; wrap.className='profile-avatar-action'; wrap.innerHTML='<span>＋</span><small>Change photo</small>';
  avatar.parentElement?.appendChild(wrap);
  const input=document.createElement('input'); input.type='file'; input.accept='image/jpeg,image/png,image/webp'; input.hidden=true; page.appendChild(input);
  wrap.onclick=()=>input.click();
  input.onchange=async()=>{
    const f=input.files?.[0]; if(!f)return;
    wrap.disabled=true; wrap.classList.add('uploading');
    try{const url=await updateAvatar(f); avatar.innerHTML=`<img src="${esc(url)}" alt="Profile photo">`; window.__MAX_AVATAR_URL=url;}
    catch(e){window.flash?window.flash(e.message):alert(e.message)}
    finally{wrap.disabled=false;wrap.classList.remove('uploading');input.value='';}
  };
}

async function openPublicProfile(userId){
  if(!userId||userId===window.__MAX_USER?.id)return;
  document.querySelector('#publicProfileModal')?.remove();
  const [p,posts,followers,following,followed]=await Promise.all([
    sb.from('profiles').select('id,username,display_name,bio,avatar_url,created_at').eq('id',userId).maybeSingle(),
    sb.from('posts').select('id,content,media_url,created_at').eq('author_id',userId).order('created_at',{ascending:false}).limit(60),
    sb.from('follows').select('follower_id',{count:'exact',head:true}).eq('following_id',userId),
    sb.from('follows').select('following_id',{count:'exact',head:true}).eq('follower_id',userId),
    sb.from('follows').select('following_id').eq('follower_id',window.__MAX_USER.id).eq('following_id',userId).maybeSingle()
  ]);
  if(p.error||!p.data){window.flash?window.flash('Profile could not be loaded.'):alert('Profile could not be loaded.');return;}
  const prof=p.data, list=posts.data||[];
  const postIds=list.map(x=>x.id);
  let likes=0;
  if(postIds.length){const lr=await sb.from('post_likes').select('post_id',{count:'exact',head:true}).in('post_id',postIds);if(!lr.error)likes=lr.count||0;}
  document.body.insertAdjacentHTML('beforeend',`<div class="profile-public-modal" id="publicProfileModal"><section class="public-profile-card"><header class="public-profile-head"><button type="button" class="public-profile-close" id="closePublicProfile">×</button><span class="kicker">PROFILE</span></header><div class="public-profile-hero"><div class="public-profile-avatar">${prof.avatar_url?`<img src="${esc(prof.avatar_url)}" alt="">`:`<span>${initial(prof.display_name)}</span>`}</div><div class="public-profile-main"><h2>${esc(prof.display_name||'User')}</h2><p>@${esc(prof.username||'user')}</p><button type="button" class="follow-btn public-follow" id="publicFollow">${followed.data?'Following':'Follow'}</button></div><p class="public-profile-bio">${esc(prof.bio||'No bio yet.')}</p></div><div class="public-profile-stats"><div><b>${list.length}</b><span>Posts</span></div><div><b>${followers.count||0}</b><span>Followers</span></div><div><b>${following.count||0}</b><span>Following</span></div><div><b>${likes}</b><span>Likes</span></div></div><div class="public-profile-grid">${list.map(q=>q.media_url?`<button type="button" class="public-post" data-public-media="${esc(q.media_url)}"><img src="${esc(q.media_url)}" alt=""><span>Open</span></button>`:`<article class="public-text-post">${esc(q.content||'')}</article>`).join('')||'<div class="profile-empty">No posts yet.</div>'}</div></section></div>`);
  const modal=$('#publicProfileModal'); $('#closePublicProfile').onclick=()=>modal.remove(); modal.onclick=e=>{if(e.target===modal)modal.remove()};
  $('#publicFollow').onclick=async()=>{const b=$('#publicFollow');b.disabled=true;try{const m=await sb.from('follows').select('following_id').eq('follower_id',window.__MAX_USER.id).eq('following_id',userId).maybeSingle();if(m.error)throw m.error;const r=m.data?await sb.from('follows').delete().eq('follower_id',window.__MAX_USER.id).eq('following_id',userId):await sb.from('follows').insert({follower_id:window.__MAX_USER.id,following_id:userId});if(r.error)throw r.error;b.textContent=m.data?'Follow':'Following';}catch(e){window.flash?window.flash(e.message):alert(e.message)}finally{b.disabled=false}};
  $$('.public-post',modal).forEach(b=>b.onclick=()=>window.openViewer?window.openViewer(b.dataset.publicMedia):null);
}

function wirePublicProfileTriggers(){
  $$('[data-follow]').forEach(b=>{const id=b.dataset.follow;if(!b.dataset.profileOpen){b.dataset.profileOpen='1';b.addEventListener('dblclick',e=>{e.preventDefault();openPublicProfile(id)})}});
  $$('.creator-copy').forEach(el=>{const article=el.closest('.reel');const follow=article?.querySelector('[data-follow]');const id=follow?.dataset.follow;if(id&&!el.dataset.profileOpen){el.dataset.profileOpen='1';el.style.cursor='pointer';el.onclick=e=>{e.stopPropagation();openPublicProfile(id)}}});
  $$('.person-main').forEach(btn=>{const id=btn.dataset.person;if(id&&!btn.dataset.profileOpen){btn.dataset.profileOpen='1';btn.addEventListener('contextmenu',e=>{e.preventDefault();openPublicProfile(id)})}});
}

const mo=new MutationObserver(()=>setTimeout(()=>{addAvatarEditor();wirePublicProfileTriggers();},50));
mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setTimeout(()=>{addAvatarEditor();wirePublicProfileTriggers();},300);
})();
