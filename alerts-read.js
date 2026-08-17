(()=>{
'use strict';
const sb=window.supabaseClient;
let busy=false;
async function markAlertsRead(){
  if(busy)return; busy=true;
  try{
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    const r=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);
    if(r.error)console.warn('MAX alerts read:',r.error.message);
  }finally{busy=false}
}
document.addEventListener('click',e=>{
  const nav=e.target.closest?.('[data-nav="bell"]');
  if(!nav)return;
  setTimeout(markAlertsRead,350);
});
})();
