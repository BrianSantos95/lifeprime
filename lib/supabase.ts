
import { createClient } from '@supabase/supabase-js';

// Substitua estas variáveis pelas suas chaves reais do Supabase
// Você as encontra em Project Settings > API no painel do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log("Supabase Init:", {
    url: supabaseUrl ? "Present" : "MISSING",
    key: supabaseAnonKey ? "Present" : "MISSING"
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase Environment Variables are MISSING! Check .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
