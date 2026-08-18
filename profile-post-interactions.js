(()=>{
'use strict';
const sb=window.supabaseClient;
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const initial=v=>(String(v||'M').trim().charAt(0).toUpperCase()||'M');
let boundProfileGrid=null;

async function getOwnProfile(){
  const uid=window.__MAX_USER?.id;if(!uid)return null;
  const r=await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id',uid).maybeSingle();
  if(r.error||!r.data)return null;return r.data;
}

function avatarHTML(profile,cls='avatar'){
  return profile?.avatar_url
    ? `<span class="${cls} avatar-image-wrap"><img src="${esc(profile.avatar_url)}" alt="Profile photo"></span>`
    : `<span class="${cls}">${initial(profile?.display_name)}</span>`;
}

async function syncOwnAvatarEverywhere(){
  const p=await getOwnProfile();if(!p)return;
  window.__MAX_PROFILE={...(window.__MAX_PROFILE||{}),...p};
  window.__MAX_AVATAR_URL=p.avatar_url||'';
  $$('.account-mini .avatar').forEach(el=>{
    el.innerHTML=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Profile photo">`:initial(p.display_name);
    el.classList.toggle('avatar-image-wrap',!!p.avatar_url);
  });

  $$('.reel .creator-row').forEach(row=>{
    const username=$('.creator-copy small',row)?.textContent?.replace(/^@/,'').trim();
    if(username&&p.username&&username.toLowerCase()===p.username.toLowerCase()){
      const av=$('.avatar',row);if(av){av.innerHTML=p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="Profile photo">`:initial(p.display_name);av.classList.toggle('avatar-image-wrap',!!p.avatar_url)}}
  });
}

async function resolveProfilePost(card){
  const uid=window.__MAX_USER?.id;if(!uid)return null;
  const media=card.querySelector('img,video')?.getAttribute('src')||'';
  const text=card.querySelector('.grid-text')?.textContent?.trim()||'';
  let q=sb.from('posts').select('id,author_id,content,media_url,created_at').eq('author_id',uid).order('created_at',{ascending:false}).limit(100);
  if(media)q=q.eq('media_url',media);
  const r=await q;
  if(r.error||!r.data?.length)return null;
  if(media)return r.data[0];
  return r.data.find(p=>p.content?.trim()===text)||r.data[0];
}

async function openPost(post){
  if(!post?.id)return;
  document.getElementById('profilePostViewer')?.remove();
  const own=post.author_id===window.__MAX_USER?.id;
  let profile=window.__MAX_PROFILE;
  if(!profile||profile.id!==post.author_id){
    const p=await sb.from('profiles').select('id,username,display_name,avatar_url').eq('id',post.author_id).maybeSingle();
    profile=p.data||{};
  }
  const parsed=(()=>{try{return post.content?.startsWith('MAXTEXT::')?JSON.parse(post.content.slice(9)):null}catch{return null}})();
  const isVideo=!!(post.media_url&&/\.(mp4|webm|mov|m4v)(\?|$)/i.test(post.media_url));
  const media=parsed
    ? `<div class="ppv-text">${esc(parsed.text||'')}</div>`
    : isVideo
      ? `<video class="ppv-media" controls playsinline src="${esc(post.media_url||'')}"></video>`
      : post.media_url
        ? `<img class="ppv-media" src="${esc(post.media_url)}" alt="">`
        : `<div class="ppv-text ppv-plain">${esc(post.content||'')}</div>`;

  document.body.insertAdjacentHTML('beforeend',`<div id="profilePostViewer" class="ppv-backdrop"><section class="ppv-card" role="dialog" aria-modal="true"><header class="ppv-head"><div class="ppv-author">${profile.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:`<span>${initial(profile.display_name)}</span>`}<div><strong>${esc(profile.display_name||'User')}</strong><small>@${esc(profile.username||'user')}</small></div></div><button id="ppvClose" type="button">×</button></header><div class="ppv-content">${media}</div><div class="ppv-caption">${parsed?'':esc(post.content||'')}</div><div class="ppv-actions"><button id="ppvLike" type="button"><span>♡</span><small>Like</small><em>0</em></button><button id="ppvComment" type="button"><span>◌</span><small>Comments</small></button>${own?'<button id="ppvDelete" class="danger" type="button"><span>⌫</span><small>Delete</small></button>':''}</div><section class="ppv-comments"><div class="ppv-comments-head"><strong>Comments</strong></div><div id="ppvCommentList">Loading…</div><form id="ppvCommentForm"><textarea id="ppvCommentText" maxlength="1000" placeholder="Write a comment…" required></textarea><button type="submit">Post comment</button></form></section></section></div>`);
  const modal=$('#profilePostViewer'),close=()=>modal.remove();
  $('#ppvClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
  const like=$('#ppvLike');
  const refresh=async()=>{const [c,m]=await Promise.all([sb.from('post_likes').select('user_id',{count:'exact',head:true}).eq('post_id',post.id),sb.from('post_likes').select('user_id').eq('post_id',post.id).eq('user_id',window.__MAX_USER.id).maybeSingle()]);if(!c.error&&!m.error){$('em',like).textContent=c.count||0;like.classList.toggle('liked',!!m.data);$('span',like).textContent=m.data?'♥':'♡'}};
  like.onclick=async()=>{like.disabled=true;try{const m=await sb.from('post_likes').select('user_id').eq('post_id',post.id).eq('user_id',window.__MAX_USER.id).maybeSingle();const r=m.data?await sb.from('post_likes').delete().eq('post_id',post.id).eq('user_id',window.__MAX_USER.id):await sb.from('post_likes').insert({post_id:post.id,user_id:window.__MAX_USER.id});if(r.error)throw r.error;await refresh()}catch(e){window.flash?.(e.message)}finally{like.disabled=false}};await refresh();

  async function loadComments(){const r=await sb.from('post_comments').select('id,author_id,content,created_at').eq('post_id',post.id).order('created_at',{ascending:true});if(r.error){$('#ppvCommentList').textContent=r.error.message;return}const ids=[...new Set((r.data||[]).map(x=>x.author_id))];const pr=ids.length?await sb.from('profiles').select('id,display_name,username,avatar_url').in('id',ids):{data:[]};const map=new Map((pr.data||[]).map(x=>[x.id,x]));$('#ppvCommentList').innerHTML=(r.data||[]).map(c=>{const u=map.get(c.author_id)||{};return `<article class="ppv-comment"><strong>${esc(u.display_name||'User')}</strong><small>@${esc(u.username||'user')}</small><p>${esc(c.content)}</p></article>`}).join('')||'<p class="ppv-muted">No comments yet.</p>'}
  $('#ppvComment').onclick=()=>$('#ppvCommentText')?.focus();
  $('#ppvCommentForm').onsubmit=async e=>{e.preventDefault();const t=$('#ppvCommentText').value.trim();if(!t)return;const r=await sb.from('post_comments').insert({post_id:post.id,author_id:window.__MAX_USER.id,content:t});if(r.error)window.flash?.(r.error.message);else{$('#ppvCommentText').value='';await loadComments()}};
  await loadComments();
  if(own)$('#ppvDelete').onclick=async()=>{if(!confirm('Delete this post?'))return;const r=await sb.from('posts').delete().eq('id',post.id).eq('author_id',window.__MAX_USER.id);if(r.error){window.flash?.(r.error.message);return}close();window.flash?.('Post deleted',true);if(typeof window.profile==='function')window.profile()};
}

async function bindProfilePosts(){
  const grid=$('.profile-grid');if(!grid||grid===boundProfileGrid)return;boundProfileGrid=grid;
  const cards=$$('.grid-item,.grid-text',grid);
  cards.forEach(card=>{if(card.dataset.postBound)return;card.dataset.postBound='1';card.style.cursor='pointer';card.addEventListener('click',async e=>{e.stopPropagation();try{const post=await resolveProfilePost(card);if(!post){window.flash?.('Post could not be opened.');return}await openPost(post)}catch(err){window.flash?.(err.message||'Could not open post.')}})});
}

const observer=new MutationObserver(()=>{bindProfilePosts();syncOwnAvatarEverywhere()});
observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setTimeout(()=>{bindProfilePosts();syncOwnAvatarEverywhere()},350);
})();
