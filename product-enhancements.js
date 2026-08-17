(() => {
  const q = s => document.querySelector(s);
  let authBusy = false;
  document.addEventListener('submit', async e => {
    if (e.target?.id !== 'authForm' || authBusy) return;
    e.preventDefault(); e.stopImmediatePropagation(); authBusy = true;
    const message=q('#formMessage'), button=q('#submitAuth'), signup=!q('#signupFields')?.hidden;
    const email=q('#email')?.value.trim(), password=q('#password')?.value||'';
    try {
      if(!email||!password) throw new Error('Enter your email and password.');
      if(button){button.disabled=true;button.textContent=signup?'Creating…':'Signing in…';}
      const client=window.supabaseClient;
      if(!client) throw new Error('MAX could not connect to its authentication service. Refresh and try again.');
      if(!signup){
        const r=await client.auth.signInWithPassword({email,password});
        if(r.error) throw r.error;
      }else{
        const username=q('#username')?.value.trim().toLowerCase(), displayName=q('#displayName')?.value.trim();
        if(!username||!displayName) throw new Error('Enter a username and display name.');
        const r=await client.auth.signUp({email,password,options:{data:{display_name:displayName}}});
        if(r.error) throw r.error;
        if(!r.data.session){if(message)message.textContent='Account created. Check your email, then sign in.';return;}
        const p=await client.from('profiles').upsert({id:r.data.user.id,username,display_name:displayName});
        if(p.error) throw p.error;
      }
      if('Notification' in window && Notification.permission==='default'){try{await Notification.requestPermission();}catch(_) {}}
      if(typeof window.render==='function') await window.render();
    }catch(err){if(message)message.textContent=err?.message||'Authentication failed. Check your details and try again.';}
    finally{authBusy=false;if(button){button.disabled=false;button.textContent=signup?'Create account':'Sign in';}}
  },true);

  async function enhanceContacts(){
    const client=window.supabaseClient,list=q('#users');if(!client||!list)return;
    const {data:me}=await client.auth.getUser();if(!me?.user)return;
    list.querySelectorAll('.contact-row[data-user]').forEach(row=>{
      if(row.querySelector('[data-enhance-follow]'))return;
      const id=row.dataset.user;if(!id||id===me.user.id)return;
      const b=document.createElement('button');b.type='button';b.dataset.enhanceFollow=id;b.className='contact-follow';b.textContent='Follow';
      b.onclick=async ev=>{ev.stopPropagation();const existing=await client.from('follows').select('following_id').eq('follower_id',me.user.id).eq('following_id',id).maybeSingle();let r;if(existing.data)r=await client.from('follows').delete().eq('follower_id',me.user.id).eq('following_id',id);else r=await client.from('follows').insert({follower_id:me.user.id,following_id:id});if(r.error){const s=q('#status');if(s)s.textContent=r.error.message;return;}b.textContent=existing.data?'Follow':'Following';b.classList.toggle('following',!existing.data);};
      row.appendChild(b);
    });
  }
  window.addEventListener('load',()=>{const app=q('#app');if(app)new MutationObserver(enhanceContacts).observe(app,{childList:true,subtree:true});enhanceContacts();});
})();
