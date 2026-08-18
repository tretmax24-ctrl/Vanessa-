(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
let observer=null;
function installCard(){
  const page=$('.simple-page');
  if(!page)return false;
  let card=$('#notificationPermissionCard');
  if(!card){
    card=document.createElement('section');
    card.id='notificationPermissionCard';
    card.className='notification-permission-card';
    card.innerHTML=`<div class="notification-permission-copy"><strong>Stay notified</strong><span>Allow MAX to alert you when something important happens.</span><small id="notificationPermissionStatus"></small></div><button type="button" id="enableMaxNotifications">Enable</button>`;
    const header=$('.page-header',page);
    if(header) header.insertAdjacentElement('afterend',card); else page.prepend(card);
  }
  const status=$('#notificationPermissionStatus',card),btn=$('#enableMaxNotifications',card);
  if(!status||!btn)return true;
  const refresh=()=>{
    if(!('Notification' in window)){
      status.textContent='Notifications are not supported by this browser.';
      btn.textContent='Unavailable'; btn.disabled=true; return;
    }
    if(Notification.permission==='granted'){
      status.textContent='Notifications are enabled on this device.';
      btn.textContent='Enabled'; btn.disabled=true;
      card.dataset.enabled='1';
    }else if(Notification.permission==='denied'){
      status.textContent='Notifications are blocked in browser/device settings.';
      btn.textContent='Blocked'; btn.disabled=true;
      card.dataset.enabled='0';
    }else{
      status.textContent='Notifications are not enabled yet.';
      btn.textContent='Enable'; btn.disabled=false;
      card.dataset.enabled='0';
    }
  };
  if(!btn.dataset.wired){
    btn.dataset.wired='1';
    btn.onclick=async()=>{
      if(!('Notification' in window))return;
      btn.disabled=true;btn.textContent='Enabling…';
      try{
        const permission=await Notification.requestPermission();
        if(permission!=='granted'){refresh();return;}
        if('serviceWorker' in navigator){
          const reg=await navigator.serviceWorker.register('./max-notifications-sw.js');
          if(reg) await reg.showNotification('MAX notifications enabled',{body:'MAX notifications are now allowed on this device.',tag:'max-notification-test',data:{url:'./'}});
        }
        refresh();
      }catch(e){
        status.textContent=e?.message||'Could not enable notifications.';
        btn.disabled=false;btn.textContent='Try again';
      }
    };
  }
  refresh();
  return true;
}
function tryInstall(){
  const ok=installCard();
  if(ok){
    if(observer){observer.disconnect();observer=null;}
    return;
  }
  setTimeout(tryInstall,250);
}
tryInstall();
observer=new MutationObserver(()=>{if(document.querySelector('.simple-page'))installCard()});
observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="bell"]'))setTimeout(installCard,50)});
})();
