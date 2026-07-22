import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://svdqdwcxvgtnjmckahsk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2ZHFkd2N4dmd0bmptY2thaHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NDExNDYsImV4cCI6MjEwMDMxNzE0Nn0.IE3FwEYrXmOJkbwUgOjm0duGPiLB8dcXwMtCeB5WL5k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
