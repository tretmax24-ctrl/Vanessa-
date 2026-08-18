(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);

function removeCameraCard(){
  document.querySelectorAll('.create-card.camera').forEach(el=>el.remove());
}

function addMediaTools(){
  const panel=$('#creatorPanel'),input=$('#mediaInput'),preview=$('#previewBox');
  if(!panel||!input||!preview||$('.media-studio-tools',panel))return;
  const tools=document.createElement('div');
  tools.className='media-studio-tools';
  tools.innerHTML=`<div class="studio-meta"><span id="mediaMeta">Choose a file to begin</span><div><button type="button" id="replaceMedia" class="studio-btn">Replace</button><button type="button" id="removeMedia" class="studio-btn subtle">Remove</button></div></div><div class="studio-tip">Vertical video works best in the MAX feed.</div>`;
  preview.after(tools);
  $('#replaceMedia').onclick=()=>input.click();
  $('#removeMedia').onclick=()=>{input.value='';preview.innerHTML='';$('#mediaMeta').textContent='Choose a file to begin'};
  input.addEventListener('change',()=>{const f=input.files?.[0];if(f)$('#mediaMeta').textContent=`${f.name} • ${Math.max(1,Math.round(f.size/1024/1024*10)/10)} MB`});
}

function addPreviewAction(){
  const panel=$('#creatorPanel');
  if(!panel||$('.review-row',panel))return;
  const publish=$('#publishMedia')||$('#publishText');
  if(!publish)return;
  const row=document.createElement('div');
  row.className='review-row';
  row.innerHTML='<button type="button" class="secondary" id="previewCreate">Preview</button><span>Review your post before publishing.</span>';
  publish.before(row);
  $('#previewCreate').onclick=()=>openPreview();
}

function openPreview(){
  const media=$('#previewBox img, #previewBox video');
  const text=$('#textBody')?.value||'';
  const caption=$('#mediaCaption')?.value||'';
  const canvas=$('#textCanvas');
  const style=canvas?.className.match(/style-([a-z0-9_-]+)/)?.[1]||'midnight';
  document.body.insertAdjacentHTML('beforeend',`<div class="create-preview-modal" id="createPreviewModal"><section class="create-preview-card"><header><div><span>PREVIEW</span><h2>Before you publish</h2></div><button id="closeCreatePreview" class="preview-close">×</button></header><div class="preview-post">${canvas?`<div class="preview-text style-${style}">${escText(text)}</div>`:(media?media.cloneNode(true).outerHTML:'<div class="preview-empty">No media selected.</div>')}${caption?`<p>${escText(caption)}</p>`:''}</div><footer><button class="secondary" id="backCreatePreview">Keep editing</button><button class="primary" id="publishFromPreview">Publish</button></footer></section></div>`);
  const close=()=>$('#createPreviewModal')?.remove();
  $('#closeCreatePreview').onclick=close;
  $('#backCreatePreview').onclick=close;
  $('#publishFromPreview').onclick=()=>{close();($('#publishMedia')||$('#publishText'))?.click()};
}

function escText(v){return String(v||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}

function enhance(){
  removeCameraCard();
  const panel=$('#creatorPanel');
  if(!panel||panel.hidden)return;
  if($('#mediaInput'))addMediaTools();
  addPreviewAction();
}

const mo=new MutationObserver(()=>setTimeout(enhance,25));
mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
setTimeout(enhance,250);
})();
