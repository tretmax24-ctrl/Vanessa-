(()=>{
'use strict';
const sb=window.supabaseClient;
if(!sb)return;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const initial=v=>(String(v||'M').trim().charAt(0).toUpperCase()||'M');

async function getProfile(){
  const u=window.__MAX_USER;
  if(!u)throw new Error('Please sign in again.');
  const r=await sb.from('profiles').select('id,username,display_name,bio,avatar_url').eq('id',u.id).single();
  if(r.error)throw r.error;
  window.__MAX_PROFILE=r.data;
  return r.data;
}

function renderPageAvatar(profile){
  const page=$('.profile-page');
  if(!page)return;
  const box=page.querySelector('.profile-avatar-large');
  if(!box)return;
  box.innerHTML=profile.avatar_url
    ? `<img src="${esc(profile.avatar_url)}" alt="Profile photo">`
    : `<span>${initial(profile.display_name)}</span>`;
}

async function uploadPhoto(file){
  if(!file||!file.type.startsWith('image/'))throw new Error('Choose a JPG, PNG or WebP image.');
  if(file.size>8*1024*1024)throw new Error('Profile photo must be 8 MB or smaller.');
  const u=window.__MAX_USER;
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const path=`${u.id}/profile-avatar-${crypto.randomUUID()}.${ext}`;
  const up=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});
  if(up.error)throw up.error;
  const url=sb.storage.from('post-media').getPublicUrl(path).data.publicUrl;
  const saved=await sb.from('profiles').update({avatar_url:url}).eq('id',u.id).select('id,avatar_url').single();
  if(saved.error)throw saved.error;
  if(saved.data.avatar_url!==url)throw new Error('The new profile photo was not saved.');
  window.__MAX_AVATAR_URL=url;
  window.__MAX_PROFILE={...(window.__MAX_PROFILE||{}),avatar_url:url};
  return url;
}

function closeEditor(){document.getElementById('maxProfileEditor')?.remove();}

async function openEditor(e){
  e?.preventDefault();
  e?.stopPropagation();
  e?.stopImmediatePropagation?.();
  closeEditor();
  let profile;
  try{profile=await getProfile();}
  catch(err){window.flash?window.flash(err.message):alert(err.message);return false;}

  const root=document.createElement('div');
  root.id='maxProfileEditor';
  root.className='max-profile-editor';
  root.innerHTML=`
    <section class="max-profile-editor-card" role="dialog" aria-modal="true" aria-labelledby="maxProfileEditorTitle">
      <header class="max-profile-editor-head">
        <div><div class="max-profile-editor-eyebrow">PROFILE</div><h2 class="max-profile-editor-title" id="maxProfileEditorTitle">Edit profile</h2></div>
        <button type="button" class="max-profile-editor-close" data-close-profile-editor aria-label="Close">×</button>
      </header>
      <form class="max-profile-editor-body" id="maxProfileEditorForm">
        <section class="max-profile-editor-photo">
          <div class="max-profile-editor-avatar" id="maxProfileEditorAvatar">${profile.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="Profile photo">`:`<span>${initial(profile.display_name)}</span>`}</div>
          <div class="max-profile-editor-photo-copy">
            <strong>Profile photo</strong>
            <span>Use a clear photo that represents you.</span>
            <button type="button" class="max-profile-editor-change" id="maxProfileChangePhoto">Change profile picture</button>
            <input id="maxProfilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" hidden>
          </div>
        </section>
        <div class="max-profile-editor-field"><label for="maxProfileName">Display name</label><input id="maxProfileName" maxlength="80" required value="${esc(profile.display_name||'')}"><span class="max-profile-editor-help">This is the name people see.</span></div>
        <div class="max-profile-editor-field"><label for="maxProfileUsername">Username</label><input id="maxProfileUsername" maxlength="30" minlength="3" required value="${esc(profile.username||'')}"><span class="max-profile-editor-help">Your public @username.</span></div>
        <div class="max-profile-editor-field"><label for="maxProfileBio">Bio</label><textarea id="maxProfileBio" maxlength="280" placeholder="Tell people a little about you…">${esc(profile.bio||'')}</textarea><span class="max-profile-editor-help"><span id="maxProfileBioCount">${String(profile.bio||'').length}</span>/280</span></div>
        <p class="max-profile-editor-error" id="maxProfileEditorError" aria-live="polite"></p>
        <div class="max-profile-editor-actions"><button type="button" class="max-profile-editor-cancel" data-close-profile-editor>Cancel</button><button type="submit" class="max-profile-editor-save" id="maxProfileEditorSave">Save changes</button></div>
      </form>
    </section>`;
  document.body.appendChild(root);

  root.addEventListener('click',ev=>{if(ev.target===root)closeEditor();});
  $$('[data-close-profile-editor]',root).forEach(btn=>btn.addEventListener('click',closeEditor));

  const photoBtn=$('#maxProfileChangePhoto',root), photoInput=$('#maxProfilePhotoInput',root), avatar=$('#maxProfileEditorAvatar',root);
  photoBtn.onclick=()=>photoInput.click();
  photoInput.onchange=async()=>{
    const file=photoInput.files?.[0]; if(!file)return;
    photoBtn.disabled=true; photoBtn.textContent='Saving…';
    try{
      const url=await uploadPhoto(file);
      avatar.innerHTML=`<img src="${esc(url)}" alt="Profile photo">`;
      renderPageAvatar(window.__MAX_PROFILE);
      photoBtn.textContent='Picture saved';
      setTimeout(()=>{photoBtn.textContent='Change profile picture';photoBtn.disabled=false;},1100);
    }catch(err){photoBtn.disabled=false;photoBtn.textContent='Change profile picture';$('#maxProfileEditorError',root).textContent=err.message||'Could not update the profile picture.';}
    photoInput.value='';
  };

  const bio=$('#maxProfileBio',root), count=$('#maxProfileBioCount',root);
  bio.oninput=()=>count.textContent=String(bio.value.length);

  $('#maxProfileEditorForm',root).onsubmit=async ev=>{
    ev.preventDefault();
    const err=$('#maxProfileEditorError',root), save=$('#maxProfileEditorSave',root);
    const displayName=$('#maxProfileName',root).value.trim();
    const username=$('#maxProfileUsername',root).value.trim().toLowerCase().replace(/\s+/g,'');
    const bioValue=bio.value.trim();
    err.textContent='';
    if(!displayName)return err.textContent='Display name is required.';
    if(!/^[a-z0-9._-]{3,30}$/.test(username))return err.textContent='Username must be 3–30 characters: letters, numbers, dot, underscore or hyphen.';
    save.disabled=true;save.textContent='Saving…';
    try{
      const r=await sb.from('profiles').update({display_name:displayName,username,bio:bioValue||null}).eq('id',window.__MAX_USER.id).select('id,username,display_name,bio,avatar_url').single();
      if(r.error)throw r.error;
      window.__MAX_PROFILE=r.data;
      renderPageAvatar(r.data);
      closeEditor();
      if(typeof window.__MAX_RENDER_PROFILE==='function')await window.__MAX_RENDER_PROFILE();
    }catch(error){err.textContent=error.message||'Could not save profile.';save.disabled=false;save.textContent='Save changes';}
  };

  $('#maxProfileName',root).focus();
  return false;
}

// Capture the Edit Profile click before the legacy handler can create its old modal.
document.addEventListener('click',ev=>{
  const btn=ev.target.closest('#editProfile');
  if(!btn)return;
  openEditor(ev);
},true);

// Remove legacy avatar controls and continuously synchronize the visible profile avatar from Supabase.
const observer=new MutationObserver(()=>{
  $$('.profile-avatar-action').forEach(x=>x.remove());
  const page=$('.profile-page');
  if(page&&!page.dataset.maxAvatarLoaded){
    page.dataset.maxAvatarLoaded='1';
    getProfile().then(renderPageAvatar).catch(()=>{});
  }
});
observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
