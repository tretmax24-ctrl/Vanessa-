(() => {
  let channel = null;
  async function startMessageNotifications() {
    const sb = window.supabaseClient;
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    const user = data?.user;
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (_) {}
    }
    if (channel) sb.removeChannel(channel);
    channel = sb.channel('max-message-notifications-' + user.id)
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'messages'}, async payload => {
        const msg = payload.new;
        if (!msg || msg.sender_id === user.id) return;
        let title = 'New MAX message';
        let body = msg.content || 'You received a new message.';
        try {
          const member = await sb.from('conversation_members').select('conversation_id').eq('conversation_id', msg.conversation_id).eq('user_id', user.id).maybeSingle();
          if (member.error || !member.data) return;
          const actor = await sb.from('profiles').select('display_name,username').eq('id', msg.sender_id).maybeSingle();
          if (actor.data?.display_name) title = actor.data.display_name;
        } catch (_) {}
        const status = document.getElementById('status');
        if (status) { status.textContent = title + ': ' + body; status.className = 'ok'; setTimeout(() => { if (status.textContent === title + ': ' + body) status.textContent = ''; }, 5000); }
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, { body, tag: 'max-' + msg.conversation_id }); } catch (_) {}
        }
      }).subscribe();
  }
  window.addEventListener('max:ready', startMessageNotifications);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') startMessageNotifications(); });
})();
