import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://slefvgtaoemxnnupycyd.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZWZ2Z3Rhb2VteG5udXB5Y3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzI3MjYsImV4cCI6MjA4NzAwODcyNn0.n4Uw4zt9sFca_n9AwmcKUw5lLgHtAbPLKjG5TyAJW8M';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing! Check your .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);