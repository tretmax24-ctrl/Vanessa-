(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const initial=v=>(String(v||'M').trim().charAt(0).toUpperCase()||'M');

function flashMsg(msg,ok=false){if(window.flash)window.flash(msg,ok);else if(window.status){window.status.textContent=msg}}

function removeLegacyAvatarControl(){
  $$('.profile-avatar-action').forEach(el=>el.remove());
}

async function loadOwnProfile(){
  const u=window.__MAX_USER;
  if(!u)return null;
  const r=await sb.from('profiles').select('id,username,display_name,bio,avatar_url').eq('id',u.id).maybeSingle();
  if(r.error||!r.data)return null;
  window.__MAX_PROFILE=r.data;
  window.__MAX_AVATAR_URL=r.data.avatar_url||'';
  return r.data;
}

async function syncProfileAvatar(){
  const page=$('.profile-page');
  if(!page)return;
  const p=await loadOwnProfile();
  if(!p)return;
  const avatar=page.querySelector('.profile-avatar-large');
  if(avatar){avatar.innerHTML=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Profile photo">`:`<span>${initial(p.display_name)}</span>`}
  page.querySelectorAll('.profile-grid .grid-item').forEach((el,i)=>el.setAttribute('aria-label',`Post ${i+1}`));
}

async function uploadAvatar(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('Choose an image.');
  if(file.size>8*1024*1024)throw new Error('Profile photo must be 8 MB or smaller.');
  const u=window.__MAX_USER;
  if(!u)throw new Error('Please sign in again.');
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${u.id}/profile-avatar-${crypto.randomUUID()}.${ext}`;
  const up=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
  if(up.error)throw up.error;
  const url=sb.storage.from('post-media').getPublicUrl(path).data.publicUrl;
  const saved=await sb.from('profiles').update({avatar_url:url}).eq('id',u.id).select('id,avatar_url').maybeSingle();
  if(saved.error)throw saved.error;
  if(!saved.data||saved.data.avatar_url!==url)throw new Error('Profile photo could not be saved.');
  window.__MAX_AVATAR_URL=url;
  window.__MAX_PROFILE=window.__MAX_PROFILE?{...window.__MAX_PROFILE,avatar_url:url}:{id:u.id,avatar_url:url};
  return url;
}

function findProfileFields(modal){
  return {
    name:modal.querySelector('#profileName'),
    username:modal.querySelector('#profileUsername'),
    bio:modal.querySelector('#profileBio')
  };
}

function buildEditor(modal){
  if(!modal||modal.dataset.profileRepair==='1')return;
  const f=findProfileFields(modal);
  if(!f.name||!f.username||!f.bio)return;
  modal.dataset.profileRepair='1';
  removeLegacyAvatarControl();

  // Remove duplicated/old field labels and let the new editor own the presentation.
  modal.querySelectorAll('label').forEach(l=>l.remove());
  modal.querySelectorAll('.username-field').forEach(x=>x.classList.remove('username-field'));
  modal.querySelectorAll('.profile-fields,.profile-identity-editor').forEach(x=>x.remove());

  const current=window.__MAX_PROFILE||{};
  const title=modal.querySelector('h2');
  if(title)title.textContent='Edit profile';
  const intro=modal.querySelector('.modal-intro');
  if(intro)intro.textContent='Update how your profile appears to people on MAX.';

  const form=f.name.closest('form')||modal.querySelector('form');
  if(!form)return;
  const identity=document.createElement('section');
  identity.className='profile-repair-identity';
  identity.innerHTML=`<div class="profile-repair-avatar">${current.avatar_url?`<img src="${esc(current.avatar_url)}" alt="Profile photo">`:`<span>${initial(f.name.value)}</span>`}</div><div class="profile-repair-identity-copy"><strong>${esc(f.name.value||current.display_name||'Your profile')}</strong><span>Profile photo</span><button type="button" id="profileRepairPhoto">Change profile photo</button></div><input id="profileRepairFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>`;
  form.prepend(identity);

  const fields=document.createElement('div');
  fields.className='profile-repair-fields';
  const specs=[
    [f.name,'Display name','How your name appears on MAX'],
    [f.username,'Username','Your @username'],
    [f.bio,'Bio','Tell people a little about you']
  ];
  specs.forEach(([input,titleText,hint])=>{
    const wrap=document.createElement('div');wrap.className='profile-repair-field';
    const head=document.createElement('div');head.className='profile-repair-field-head';head.innerHTML=`<strong>${titleText}</strong><span>${hint}</span>`;
    input.placeholder='';
    wrap.append(head,input);
    fields.append(wrap);
    input.parentNode?.insertBefore(wrap,input);
    wrap.append(input);
  });
  form.insertBefore(fields,form.querySelector('.modal-actions')||form.lastElementChild);

  f.name.value=current.display_name??f.name.value;
  f.username.value=current.username??f.username.value;
  f.bio.value=current.bio??f.bio.value;
  identity.querySelector('.profile-repair-identity-copy strong').textContent=f.name.value||'Your profile';

  identity.querySelector('#profileRepairPhoto').onclick=()=>identity.querySelector('#profileRepairFile').click();
  identity.querySelector('#profileRepairFile').onchange=async()=>{
    const file=identity.querySelector('#profileRepairFile').files?.[0];
    if(!file)return;
    const btn=identity.querySelector('#profileRepairPhoto');
    btn.disabled=true;btn.textContent='Saving photo…';
    try{
      const url=await uploadAvatar(file);
      identity.querySelector('.profile-repair-avatar').innerHTML=`<img src="${esc(url)}" alt="Profile photo">`;
      const page=$('.profile-page');
      const pageAvatar=page?.querySelector('.profile-avatar-large');
      if(pageAvatar)pageAvatar.innerHTML=`<img src="${esc(url)}" alt="Profile photo">`;
      btn.textContent='Photo saved';
      setTimeout(()=>{btn.textContent='Change profile photo'},1200);
    }catch(e){btn.textContent='Change profile photo';flashMsg(e.message||'Could not update profile photo')}
    finally{btn.disabled=false;identity.querySelector('#profileRepairFile').value=''}
  };
  f.name.oninput=()=>{identity.querySelector('.profile-repair-identity-copy strong').textContent=f.name.value||'Your profile'};
}

function repair(){
  removeLegacyAvatarControl();
  const page=$('.profile-page');
  if(page&&!page.dataset.avatarSynced){page.dataset.avatarSynced='1';syncProfileAvatar();}
  const modal=$('#profileModal');
  if(modal)buildEditor(modal);
}

const mo=new MutationObserver(()=>setTimeout(repair,30));
mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setTimeout(repair,100);
})();