import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const url = import.meta?.env?.VITE_SUPABASE_URL || window.MAX_CONFIG?.supabaseUrl;
const key = import.meta?.env?.VITE_SUPABASE_PUBLISHABLE_KEY || window.MAX_CONFIG?.supabaseAnonKey;

if (!url || !key || key.includes('PASTE_YOUR')) {
  console.warn('MAX: Supabase configuration is missing. Set VITE_SUPABASE_PUBLISHABLE_KEY or configure window.MAX_CONFIG.');
}

export const supabase = createClient(url, key);
