(() => {
  'use strict';
  const sb = window.supabaseClient;
  const app = document.getElementById('app');
  if (!sb || !app) return;

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const $ = (s, r = document) => r.querySelector(s);

  async function openEditor() {
    const { data: authData, error: authError } = await sb.auth.getUser();
    if (authError || !authData?.user) return;
    const uid = authData.user.id;
    const { data: profile, error } = await sb.from('profiles')
      .select('id,username,display_name,bio,avatar_url')
      .eq('id', uid)
      .single();
    if (error) {
      const status = $('#status');
      if (status) status.textContent = error.message;
      return;
    }

    document.getElementById('maxProfileModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'maxProfileModal';
    modal.innerHTML = `
      <div class="profile-editor-backdrop" data-close-editor></div>
      <section class="profile-editor-modal" role="dialog" aria-modal="true" aria-labelledby="profileEditorTitle">
        <header class="profile-editor-head">
          <div><span class="eyebrow">ACCOUNT</span><h2 id="profileEditorTitle">Edit profile</h2></div>
          <button type="button" class="profile-editor-close" data-close-editor aria-label="Close">×</button>
        </header>
        <form id="profileEditorForm" class="profile-editor-form">
          <label>Display name<input id="peName" maxlength="80" required value="${esc(profile.display_name)}"></label>
          <label>Username<input id="peUsername" maxlength="30" minlength="3" required value="${esc(profile.username)}"></label>
          <label>Bio<textarea id="peBio" maxlength="280" placeholder="Tell people about yourself…">${esc(profile.bio || '')}</textarea></label>
          <p id="peError" class="profile-editor-error" aria-live="polite"></p>
          <div class="profile-editor-actions">
            <button type="button" class="profile-editor-cancel" data-close-editor>Cancel</button>
            <button type="submit" class="profile-editor-save" id="peSave">Save changes</button>
          </div>
        </form>
      </section>`;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelectorAll('[data-close-editor]').forEach(b => b.addEventListener('click', close));

    $('#profileEditorForm', modal).addEventListener('submit', async e => {
      e.preventDefault();
      const save = $('#peSave', modal);
      const err = $('#peError', modal);
      const displayName = $('#peName', modal).value.trim();
      const username = $('#peUsername', modal).value.trim().toLowerCase().replace(/\s+/g, '');
      const bio = $('#peBio', modal).value.trim();
      err.textContent = '';

      if (displayName.length < 1) return err.textContent = 'Display name is required.';
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) return err.textContent = 'Username must be 3–30 characters: letters, numbers, dot, underscore or hyphen.';

      save.disabled = true;
      save.textContent = 'Saving…';
      try {
        const result = await sb.from('profiles')
          .update({ display_name: displayName, username, bio: bio || null })
          .eq('id', uid);
        if (result.error) throw result.error;
        close();
        if (typeof window.__MAX_RENDER_PROFILE === 'function') await window.__MAX_RENDER_PROFILE();
        else location.hash = 'profile-refresh';
      } catch (e2) {
        err.textContent = e2?.message || 'Could not save profile.';
        save.disabled = false;
        save.textContent = 'Save changes';
      }
    });
  }

  document.addEventListener('click', e => {
    const button = e.target.closest('#editProfile');
    if (!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openEditor();
  }, true);
})();
