
import { createClient } from '@supabase/supabase-js';

// Chaves carregadas das variáveis de ambiente (definidas em .env.local)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Aviso de configuração apenas em desenvolvimento (não expõe nada em produção)
if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('[HabitPulse] Variáveis de ambiente do Supabase ausentes! Verifique o arquivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
