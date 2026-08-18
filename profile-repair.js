(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const initial=v=>(String(v||'M').trim().charAt(0).toUpperCase()||'M');
const flashMsg=(m,ok=false)=>window.flash?window.flash(m,ok):void 0;

async function loadOwnProfile(){
  const u=window.__MAX_USER|| (await sb.auth.getUser()).data?.user;
  if(!u)return null;
  window.__MAX_USER=u;
  const r=await sb.from('profiles').select('id,username,display_name,bio,avatar_url').eq('id',u.id).maybeSingle();
  if(r.error||!r.data)return null;
  window.__MAX_PROFILE=r.data;
  window.__MAX_AVATAR_URL=r.data.avatar_url||'';
  return r.data;
}

async function syncAvatarOnPage(){
  const page=$('.profile-page');
  if(!page)return;
  const p=await loadOwnProfile();
  if(!p)return;
  const a=page.querySelector('.profile-avatar-large');
  if(a)a.innerHTML=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Profile photo">`:`<span>${initial(p.display_name)}</span>`;
  page.querySelectorAll('.profile-avatar-action').forEach(x=>x.remove());
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
  window.__MAX_PROFILE={...(window.__MAX_PROFILE||{}),id:u.id,avatar_url:url};
  return url;
}

async function openDedicatedEditor(){
  const p=await loadOwnProfile();
  if(!p){flashMsg('Could not load your profile.');return;}
  $('#maxEditProfileModal')?.remove();
  const modal=document.createElement('div');
  modal.id='maxEditProfileModal';
  modal.className='max-edit-profile-modal';
  const avatar=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Profile photo">`:`<span>${initial(p.display_name)}</span>`;
  modal.innerHTML=`<div class="max-edit-profile-backdrop" data-close></div><section class="max-edit-profile-card" role="dialog" aria-modal="true" aria-labelledby="maxEditTitle"><header class="max-edit-head"><div><span class="max-edit-kicker">PROFILE</span><h2 id="maxEditTitle">Edit profile</h2><p>Make your MAX profile feel like you.</p></div><button type="button" class="max-edit-close" data-close aria-label="Close">×</button></header><div class="max-edit-identity"><div class="max-edit-avatar" id="maxEditAvatar">${avatar}</div><div class="max-edit-identity-copy"><strong id="maxEditPreviewName">${esc(p.display_name||'Your profile')}</strong><span>@${esc(p.username||'username')}</span><button type="button" id="maxEditPhotoBtn">Change profile picture</button><input id="maxEditPhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden></div></div><form id="maxEditForm" class="max-edit-form"><div class="max-edit-field"><label for="maxEditName">Display name</label><input id="maxEditName" maxlength="80" value="${esc(p.display_name||'')}" required></div><div class="max-edit-field"><label for="maxEditUsername">Username</label><div class="max-edit-input-prefix"><span>@</span><input id="maxEditUsername" maxlength="30" minlength="3" value="${esc(p.username||'')}" required></div></div><div class="max-edit-field max-edit-bio"><div class="max-edit-bio-top"><label for="maxEditBio">Bio</label><span id="maxEditBioCount">${(p.bio||'').length}/280</span></div><textarea id="maxEditBio" maxlength="280" placeholder="Tell people a little about you…">${esc(p.bio||'')}</textarea></div><p id="maxEditError" class="max-edit-error" aria-live="polite"></p><footer class="max-edit-actions"><button type="button" class="max-edit-cancel" data-close>Cancel</button><button type="submit" class="max-edit-save" id="maxEditSave">Save changes</button></footer></form></section>`;
  document.body.appendChild(modal);
  const close=()=>modal.remove();
  modal.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));
  const name=$('#maxEditName',modal), bio=$('#maxEditBio',modal), count=$('#maxEditBioCount',modal), save=$('#maxEditSave',modal), err=$('#maxEditError',modal), photoBtn=$('#maxEditPhotoBtn',modal), photoInput=$('#maxEditPhotoInput',modal);
  name.oninput=()=>{$('#maxEditPreviewName',modal).textContent=name.value||'Your profile'};
  bio.oninput=()=>{count.textContent=`${bio.value.length}/280`};
  photoBtn.onclick=()=>photoInput.click();
  photoInput.onchange=async()=>{const file=photoInput.files?.[0];if(!file)return;photoBtn.disabled=true;photoBtn.textContent='Saving…';try{const url=await uploadAvatar(file);$('#maxEditAvatar',modal).innerHTML=`<img src="${esc(url)}" alt="Profile photo">`;const page=$('.profile-page');const a=page?.querySelector('.profile-avatar-large');if(a)a.innerHTML=`<img src="${esc(url)}" alt="Profile photo">`;photoBtn.textContent='Photo saved';setTimeout(()=>photoBtn.textContent='Change profile picture',1200)}catch(e){photoBtn.textContent='Change profile picture';flashMsg(e.message||'Could not update photo')}finally{photoBtn.disabled=false;photoInput.value=''}};
  $('#maxEditForm',modal).onsubmit=async e=>{e.preventDefault();err.textContent='';const displayName=name.value.trim();const username=$('#maxEditUsername',modal).value.trim().toLowerCase().replace(/\s+/g,'');const bioValue=bio.value.trim();if(!displayName)return err.textContent='Display name is required.';if(!/^[a-z0-9._-]{3,30}$/.test(username))return err.textContent='Username must be 3–30 characters.';save.disabled=true;save.textContent='Saving…';try{const r=await sb.from('profiles').update({display_name:displayName,username,bio:bioValue||null}).eq('id',window.__MAX_USER.id);if(r.error)throw r.error;window.__MAX_PROFILE={...(window.__MAX_PROFILE||{}),display_name:displayName,username,bio:bioValue||null};close();await syncAvatarOnPage()}catch(e2){err.textContent=e2?.message||'Could not save profile.';save.disabled=false;save.textContent='Save changes'}};
}

function removeLegacy(){
  $$('#profile-avatar-action,.profile-avatar-action').forEach(x=>x.remove());
  $('#profileModal')?.remove();
}

// One authoritative editor: intercept before the legacy app handler can open its form.
document.addEventListener('click',e=>{
  const btn=e.target.closest('#editProfile');
  if(!btn)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  removeLegacy();
  openDedicatedEditor();
},true);

const mo=new MutationObserver(()=>{
  removeLegacy();
  const page=$('.profile-page');
  if(page&&!page.dataset.maxAvatarSynced){page.dataset.maxAvatarSynced='1';syncAvatarOnPage();}
});
mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setTimeout(()=>{removeLegacy();syncAvatarOnPage()},120);
})();