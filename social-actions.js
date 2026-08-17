(() => {
  'use strict';
  const sb = window.supabaseClient;
  if (!sb) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let busy = new Set();

  function currentUser() {
    return window.__MAX_USER || null;
  }

  async function ensureUser() {
    if (window.__MAX_USER) return window.__MAX_USER;
    const { data } = await sb.auth.getUser();
    window.__MAX_USER = data?.user || null;
    return window.__MAX_USER;
  }

  function feedback(text, ok = false) {
    const el = $('#status');
    if (!el) return;
    el.textContent = text;
    el.className = ok ? 'ok' : 'error';
    clearTimeout(feedback.timer);
    feedback.timer = setTimeout(() => { el.textContent = ''; el.className = ''; }, 3000);
  }

  async function refreshLike(button, postId, userId) {
    const count = await sb.from('post_likes').select('user_id', { count: 'exact', head: true }).eq('post_id', postId);
    const mine = await sb.from('post_likes').select('user_id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
    if (count.error || mine.error) return;
    button.innerHTML = `${mine.data ? '♥' : '♡'}<small>${count.count || 0}</small>`;
    button.classList.toggle('liked', !!mine.data);
    button.setAttribute('aria-pressed', String(!!mine.data));
  }

  async function toggleLike(button, postId) {
    const user = await ensureUser();
    if (!user) return feedback('Sign in to like posts.');
    const key = `like:${postId}`;
    if (busy.has(key)) return;
    busy.add(key);
    button.disabled = true;
    try {
      const mine = await sb.from('post_likes').select('user_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle();
      if (mine.error) throw mine.error;
      const result = mine.data
        ? await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
        : await sb.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (result.error) throw result.error;
      await refreshLike(button, postId, user.id);
    } catch (e) {
      feedback(e.message || 'Could not update like.');
    } finally {
      busy.delete(key);
      button.disabled = false;
    }
  }

  async function refreshFollow(button, targetId, userId) {
    const mine = await sb.from('follows').select('following_id').eq('follower_id', userId).eq('following_id', targetId).maybeSingle();
    if (mine.error) return;
    const following = !!mine.data;
    button.textContent = following ? 'Following' : 'Follow';
    button.classList.toggle('following', following);
    button.setAttribute('aria-pressed', String(following));
  }

  async function toggleFollow(button, targetId) {
    const user = await ensureUser();
    if (!user) return feedback('Sign in to follow people.');
    if (targetId === user.id) return;
    const key = `follow:${targetId}`;
    if (busy.has(key)) return;
    busy.add(key);
    button.disabled = true;
    try {
      const mine = await sb.from('follows').select('following_id').eq('follower_id', user.id).eq('following_id', targetId).maybeSingle();
      if (mine.error) throw mine.error;
      const result = mine.data
        ? await sb.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId)
        : await sb.from('follows').insert({ follower_id: user.id, following_id: targetId });
      if (result.error) throw result.error;
      await refreshFollow(button, targetId, user.id);
      feedback(mine.data ? 'Unfollowed.' : 'Following.', true);
    } catch (e) {
      feedback(e.message || 'Could not update follow.');
    } finally {
      busy.delete(key);
      button.disabled = false;
    }
  }

  document.addEventListener('click', async event => {
    const like = event.target.closest('[data-like]');
    if (like) {
      event.preventDefault();
      event.stopImmediatePropagation();
      await toggleLike(like, like.dataset.like);
      return;
    }
    const follow = event.target.closest('[data-follow]');
    if (follow) {
      event.preventDefault();
      event.stopImmediatePropagation();
      await toggleFollow(follow, follow.dataset.follow);
    }
  }, true);

  const observer = new MutationObserver(async () => {
    const user = await ensureUser();
    if (!user) return;
    document.querySelectorAll('[data-like]').forEach(b => refreshLike(b, b.dataset.like, user.id));
    document.querySelectorAll('[data-follow]').forEach(b => refreshFollow(b, b.dataset.follow, user.id));
  });
  observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
})();
