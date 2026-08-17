(() => {
  const sb = () => window.supabaseClient;
  let channel = null, activeUserId = null;
  async function sync() {
    const client = sb(); if (!client) return;
    const { data } = await client.auth.getUser();
    const user = data?.user;
    if (!user) { if (channel) { client.removeChannel(channel); channel = null; activeUserId = null; } return; }
    if (activeUserId === user.id && channel) return;
    if (channel) client.removeChannel(channel);
    activeUserId = user.id;
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (_) {}
    }
    channel = client.channel('max-message-notifications-' + user.id)
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'messages'}, async payload => {
        const msg = payload.new;
        if (!msg || msg.sender_id === user.id) return;
        const member = await client.from('conversation_members').select('conversation_id').eq('conversation_id', msg.conversation_id).eq('user_id', user.id).maybeSingle();
        if (member.error || !member.data) return;
        const actor = await client.from('profiles').select('display_name').eq('id', msg.sender_id).maybeSingle();
        const title = actor.data?.display_name || 'New MAX message';
        const body = msg.content || 'You received a new message.';
        const status = document.getElementById('status');
        if (status) { status.textContent = `${title}: ${body}`; status.className = 'ok'; setTimeout(() => { status.textContent = ''; }, 5000); }
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, {body, tag:'max-'+msg.conversation_id}); } catch (_) {}
        }
      }).subscribe();
  }
  window.addEventListener('load', sync);
  document.addEventListener('visibilitychange', sync);
  setInterval(sync, 3000);
})();
