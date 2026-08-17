(()=>{
'use strict';
const app=document.getElementById('app');
const $=(s,r=document)=>r.querySelector(s);
let bound=false;
function forceComposer(){
  const conv=$('#conversation');
  const form=$('#chatForm');
  const input=$('#chatText');
  if(!conv||!form||!input||conv.hidden)return;
  form.style.setProperty('display','flex','important');
  form.style.setProperty('visibility','visible','important');
  form.style.setProperty('opacity','1','important');
  form.style.setProperty('position','fixed','important');
  form.style.setProperty('left','0','important');
  form.style.setProperty('right','0','important');
  form.style.setProperty('bottom','0','important');
  form.style.setProperty('z-index','25000','important');
  form.style.setProperty('min-height','68px','important');
  form.style.setProperty('height','68px','important');
  form.style.setProperty('padding','10px 12px calc(10px + env(safe-area-inset-bottom,0px))','important');
  form.style.setProperty('background','rgba(11,14,19,.98)','important');
  form.style.setProperty('border-top','1px solid rgba(255,255,255,.09)','important');
  input.style.setProperty('display','block','important');
  input.style.setProperty('visibility','visible','important');
  input.style.setProperty('opacity','1','important');
  input.style.setProperty('height','46px','important');
  input.style.setProperty('flex','1 1 auto','important');
  input.style.setProperty('min-width','0','important');
  input.style.setProperty('background','#171b23','important');
  input.style.setProperty('color','#fff','important');
  input.style.setProperty('border','1px solid rgba(255,255,255,.09)','important');
  input.style.setProperty('border-radius','16px','important');
  input.style.setProperty('padding','0 16px','important');
  const send=form.querySelector('button');
  if(send){send.style.setProperty('display','grid','important');send.style.setProperty('visibility','visible','important');send.style.setProperty('opacity','1','important');send.style.setProperty('width','46px','important');send.style.setProperty('height','46px','important');send.style.setProperty('flex','0 0 46px','important');}
  document.body.style.paddingBottom='68px';
  bound=true;
}
function watch(){
  if(!app)return;
  const mo=new MutationObserver(()=>requestAnimationFrame(forceComposer));
  mo.observe(app,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-person],#backToPeople'))setTimeout(forceComposer,40)},true);
  window.addEventListener('resize',forceComposer);
  forceComposer();
}
watch();
})();
