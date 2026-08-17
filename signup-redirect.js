(() => {
  'use strict';
  const sb = window.supabaseClient;
  if (!sb?.auth?.signUp) return;

  const productionRedirect = 'https://tretmax24-ctrl.github.io/Vanessa-/';
  const originalSignUp = sb.auth.signUp.bind(sb.auth);

  sb.auth.signUp = (credentials) => {
    const options = credentials?.options ? { ...credentials.options } : {};
    options.emailRedirectTo = productionRedirect;
    return originalSignUp({ ...credentials, options });
  };
})();
