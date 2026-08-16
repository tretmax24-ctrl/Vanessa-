import { supabase } from './src/supabase-client.js';
import { signUp, signIn, signOut, getCurrentUser, getProfile, updateProfile, watchAuth } from './src/auth.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const status = $('#status');

function message(text, good = false) {
  status.textContent = text;
  status.className = good ? 'ok' : 'error';
}

function authView() {
  app.innerHTML = `
    <section class="card auth-card">
      <h1>Welcome to MAX</h1><p class="muted">Connect, chat, call and use AI.</p>
      <div class="tabs"><button id="loginTab">Sign in</button><button class="secondary" id="signupTab">Create account</button></div>
      <form id="authForm">
        <div id="signupFields" hidden><label>Username</label><input id="username" minlength="3" maxlength="30" required><label>Display name</label><input id="displayName" maxlength="80" required></div>
        <label>Email</label><input id="email" type="email" required autocomplete="email">
        <label>Password</label><input id="password" type="password" minlength="6" required autocomplete="current-password">
        <button id="submitAuth" type="submit">Sign in</button>
      </form><p id="formMessage" class="muted"></p>
    </section>`;
  let mode = 'login';
  const fields = $('#signupFields');
  const submit = $('#submitAuth');
  $('#loginTab').onclick = () => { mode = 'login'; fields.hidden = true; submit.textContent = 'Sign in'; };
  $('#signupTab').onclick = () => { mode = 'signup'; fields.hidden = false; submit.textContent = 'Create account'; };
  $('#authForm').onsubmit = async (e) => {
    e.preventDefault(); const formMessage = $('#formMessage'); formMessage.textContent = 'Working...';
    try {
      if (mode === 'login') await signIn($('#email').value.trim(), $('#password').value);
      else {
        const result = await signUp({ email: $('#email').value.trim(), password: $('#password').value, username: $('#username').value.trim().toLowerCase(), displayName: $('#displayName').value.trim() });
        if (!result.session) { formMessage.textContent = 'Account created. Check your email if confirmation is enabled.'; return; }
      }
      await render();
    } catch (err) { formMessage.textContent = err.message || 'Authentication failed'; }
  };
}

async function profileView(user) {
  let profile;
  try { profile = await getProfile(user.id); } catch (e) { message(e.message); return; }
  app.innerHTML = `
    <section class="card profile-page"><div class="avatar">${(profile.display_name || 'M')[0].toUpperCase()}</div>
      <h1>${escapeHtml(profile.display_name)}</h1><p class="muted">@${escapeHtml(profile.username)}</p>
      <form id="profileForm"><label>Display name</label><input id="pName" value="${escapeAttr(profile.display_name)}" maxlength="80" required><label>Username</label><input id="pUsername" value="${escapeAttr(profile.username)}" minlength="3" maxlength="30" required><label>Bio</label><textarea id="pBio" maxlength="500">${escapeHtml(profile.bio || '')}</textarea><button>Save profile</button><button type="button" class="secondary" id="logout">Sign out</button></form>
    </section>`;
  $('#profileForm').onsubmit = async (e) => { e.preventDefault(); try { await updateProfile(user.id, { display_name: $('#pName').value.trim(), username: $('#pUsername').value.trim().toLowerCase(), bio: $('#pBio').value.trim() }); message('Profile saved.', true); await profileView(user); } catch (e) { message(e.message); } };
  $('#logout').onclick = async () => { await signOut(); await render(); };
}

function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function escapeAttr(v) { return escapeHtml(v); }

async function render() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) { authView(); return; }
  $('#topActions').innerHTML = '<button id="profileBtn">My profile</button>';
  app.innerHTML = '<section class="card"><h1>MAX Community</h1><p class="muted">You are signed in. Your account is connected to Supabase.</p><button id="profileBtn2">Open profile</button></section>';
  $('#profileBtn').onclick = () => profileView(user);
  $('#profileBtn2').onclick = () => profileView(user);
}

watchAuth(() => render());
render();
