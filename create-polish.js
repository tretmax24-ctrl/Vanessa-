(()=>{
'use strict';
function enhanceCreate(){
 const page=document.querySelector('.create-page'); if(!page)return;
 const choices=document.getElementById('createChoices');
 if(choices&&!choices.dataset.polished){choices.dataset.polished='1';choices.setAttribute('aria-label','Create content');}
 const drop=document.querySelector('.media-drop');
 const input=document.getElementById('mediaInput');
 if(drop&&input&&!drop.dataset.polished){
  drop.dataset.polished='1';
  ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('dragging')}));
  ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('dragging')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer?.files?.[0];if(!f)return;try{const dt=new DataTransfer();dt.items.add(f);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}catch{}});
 }
 const caption=document.getElementById('mediaCaption');
 const count=document.getElementById('captionCount');
 if(caption&&count&&!caption.dataset.polished){caption.dataset.polished='1';caption.addEventListener('input',()=>count.textContent=`${caption.value.length} / ${caption.maxLength||1500}`)}
 const file=input?.files?.[0];
 const preview=document.getElementById('previewBox');
 if(file&&preview&&!preview.dataset.meta){
  preview.dataset.meta='1';
  const meta=document.createElement('div');meta.className='create-media-meta';
  const size=(file.size/1024/1024).toFixed(1);
  meta.innerHTML=`<span>${file.type.startsWith('video/')?'VIDEO':'IMAGE'}</span><b>${file.name}</b><small>${size} MB</small>`;
  preview.appendChild(meta);
 }
}
const mo=new MutationObserver(enhanceCreate);mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});enhanceCreate();
})();
