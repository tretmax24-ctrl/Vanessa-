import { supabase } from './supabase-client.js';

export async function signUp({ email, password, username, displayName }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({ id: data.user.id, username, display_name: displayName });
    if (profileError) throw profileError;
  }
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  const allowed = { username: updates.username, display_name: updates.display_name, bio: updates.bio, avatar_url: updates.avatar_url };
  const { data, error } = await supabase.from('profiles').update(allowed).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}

export function watchAuth(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}
