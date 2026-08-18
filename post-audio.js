(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s), esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
let feedObserver=null;
function addAudioPicker(){
 const panel=$('#creatorPanel'); if(!panel||panel.hidden||$('.post-audio-picker',panel))return;
 const type=(panel.dataset.createType||'').toLowerCase();
 const mount=type==='text'?$('#textCanvas',panel):$('#mediaCaption',panel)?.parentElement;
 if(!mount)return;
 const wrap=document.createElement('div'); wrap.className='post-audio-picker';
 wrap.innerHTML=`<div class="post-audio-head"><div><strong>Background audio</strong><span>Optional • add sound to this post</span></div><label class="audio-add-btn">Add audio<input id="postAudioInput" type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/x-wav" hidden></label></div><div id="postAudioPreview" class="post-audio-preview" hidden></div>`;
 mount.after(wrap);
 const input=$('#postAudioInput',wrap), preview=$('#postAudioPreview',wrap);
 input.onchange=()=>{const f=input.files?.[0]; if(!f){preview.hidden=true;preview.innerHTML='';return;} if(f.size>20*1024*1024){input.value='';preview.hidden=true;flash?.('Audio must be 20 MB or smaller.');return;} const url=URL.createObjectURL(f); preview.hidden=false; preview.innerHTML=`<div class="audio-preview-card"><span class="audio-note-icon">♫</span><div><b>${esc(f.name)}</b><small>${(f.size/1024/1024).toFixed(1)} MB</small></div><audio controls preload="metadata" src="${url}"></audio><button type="button" id="removePostAudio">×</button></div>`;$('#removePostAudio').onclick=()=>{input.value='';preview.hidden=true;preview.innerHTML='';URL.revokeObjectURL(url)};};
}
async function uploadFile(file,userId){const ext=(file.name.split('.').pop()||'bin').toLowerCase();const path=`${userId}/${crypto.randomUUID()}.${ext}`;const up=await sb.storage.from('post-media').upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;return sb.storage.from('post-media').getPublicUrl(path).data.publicUrl}
async function publishWithAudio(){
 const u=window.__MAX_USER||((await sb.auth.getUser()).data?.user); if(!u)throw new Error('Please sign in again.');
 const panel=$('#creatorPanel'); const type=(panel?.dataset.createType||'').toLowerCase(); const audio=$('#postAudioInput')?.files?.[0]||null;
 if(!audio)return false;
 const text=type==='text'?($('#textBody')?.value||'').trim():($('#mediaCaption')?.value||'').trim();
 const style=type==='text'?($('#textCanvas')?.className.match(/style-([a-z0-9_-]+)/)?.[1]||'midnight'):null;
 const mediaFile=type!=='text'?($('#mediaInput')?.files?.[0]||null):null;
 if(!text&&!mediaFile)throw new Error('Add text or media first.');
 const btn=$('#publishMedia')||$('#publishText'); if(btn){btn.disabled=true;btn.textContent='Publishing…'}
 try{
   let media_url=null; if(mediaFile)media_url=await uploadFile(mediaFile,u.id);
   const audio_url=await uploadFile(audio,u.id);
   const content=style?`MAXTEXT::${JSON.stringify({text,style})}`:(text||null);
   const r=await sb.from('posts').insert({author_id:u.id,content,media_url,audio_url}); if(r.error)throw r.error;
   if(typeof window.home==='function'){};
   if(btn){btn.textContent='Published ✓'}
   setTimeout(()=>{window.location.reload()},500);
   return true;
 }catch(e){if(btn){btn.disabled=false;btn.textContent=style?'Publish':'Publish to MAX'};throw e}
}
function wirePublish(){const panel=$('#creatorPanel');if(!panel||panel.hidden)return;const type=(panel.dataset.createType||'').toLowerCase();if(type==='camera')return;
 const btn=$('#publishMedia')||$('#publishText');if(!btn||btn.dataset.audioWired)return;btn.dataset.audioWired='1';const original=btn.onclick;btn.onclick=async e=>{const has=!!$('#postAudioInput')?.files?.[0];if(!has){original?.call(btn,e);return;}e.preventDefault();try{await publishWithAudio()}catch(err){(window.flash||window.alert)(err.message||'Could not publish')}};
}
function enhance(){addAudioPicker();wirePublish();}
function augmentFeed(){
 const feed=$('#feed');if(!feed)return;
 const reels=[...feed.querySelectorAll('.reel[data-reel]')];if(!reels.length)return;
 Promise.all(reels.map(async reel=>{if(reel.querySelector('.post-audio-control'))return;const id=reel.dataset.reel;const r=await sb.from('posts').select('audio_url').eq('id',id).maybeSingle();const url=r.data?.audio_url;if(!url)return;const media=reel.querySelector('.reel-media');if(!media)return;const box=document.createElement('div');box.className='post-audio-control';box.innerHTML=`<button type="button" class="post-audio-toggle" aria-label="Play post audio">♫</button><span>Sound</span><audio preload="metadata" loop src="${esc(url)}"></audio>`;media.appendChild(box);const a=box.querySelector('audio'), t=box.querySelector('button');t.onclick=e=>{e.stopPropagation();if(a.paused){a.play().then(()=>{t.classList.add('playing')}).catch(()=>{});t.setAttribute('aria-label','Pause post audio')}else{a.pause();t.classList.remove('playing');t.setAttribute('aria-label','Play post audio')}};if(feedObserver&&!reel.__audioObserved){reel.__audioObserved=true;feedObserver.observe(reel)} })).catch(()=>{});
}
function init(){const mo=new MutationObserver(()=>{enhance();augmentFeed()});mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});enhance();augmentFeed();}
init();
})();
