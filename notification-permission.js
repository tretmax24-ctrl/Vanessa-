(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);

function installCard(){
  const page=$('.simple-page');
  if(!page || $('#notificationPermissionCard')) return;
  const card=document.createElement('section');
  card.id='notificationPermissionCard';
  card.className='notification-permission-card';
  card.innerHTML=`<div class="notification-permission-copy"><strong>Stay notified</strong><span>Allow MAX to alert you when something important happens.</span><small id="notificationPermissionStatus"></small></div><button type="button" id="enableMaxNotifications">Enable</button>`;
  const header=$('.page-header',page);
  if(header) header.insertAdjacentElement('afterend',card); else page.insertBefore(card,page.firstChild);
  const status=$('#notificationPermissionStatus',card),btn=$('#enableMaxNotifications',card);

  const refresh=()=>{
    if(!('Notification' in window)){
      status.textContent='Notifications are not supported by this browser.';
      btn.disabled=true; btn.textContent='Unavailable'; return;
    }
    if(Notification.permission==='granted'){
      status.textContent='Notifications are enabled on this device.';
      btn.textContent='Enabled'; btn.disabled=true;
    }else if(Notification.permission==='denied'){
      status.textContent='Notifications are blocked in your browser settings.';
      btn.textContent='Blocked'; btn.disabled=true;
    }else{
      status.textContent='You have not enabled MAX notifications yet.';
      btn.textContent='Enable'; btn.disabled=false;
    }
  };

  btn.onclick=async()=>{
    if(!('Notification' in window)) return;
    btn.disabled=true; btn.textContent='Enabling…';
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted'){refresh();return;}
      if('serviceWorker' in navigator){
        const reg=await navigator.serviceWorker.register('./max-notifications-sw.js');
        if(reg?.showNotification){
          await reg.showNotification('MAX notifications enabled',{body:'You’ll now be able to receive MAX alerts here.',tag:'max-notification-test',data:{url:'./'}});
        }
      }
      refresh();
    }catch(e){
      status.textContent=e?.message||'Could not enable notifications.';
      btn.disabled=false; btn.textContent='Try again';
    }
  };
  refresh();
}

document.addEventListener('click',e=>{
  if(!e.target.closest?.('[data-nav="bell"]')) return;
  setTimeout(installCard,100);
});
})();
