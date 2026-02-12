import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Zap, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';

interface AuthProps {
    onLoginSuccess: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Verifique seu e-mail para confirmar o cadastro!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onLoginSuccess();
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Ocorreu um erro.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

            <div className="w-full max-w-md bg-[#111111] border border-zinc-800 p-8 rounded-2xl shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl mb-4 shadow-lg shadow-red-900/30">
                        <Zap size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Life Prime</h1>
                    <p className="text-zinc-500">Gerencie sua vida com inteligência.</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {isSignUp ? 'Criar Conta' : 'Entrar'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                    <p className="text-zinc-500 text-sm">
                        {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="ml-2 text-white font-semibold hover:text-red-500 transition-colors"
                        >
                            {isSignUp ? 'Fazer Login' : 'Cadastre-se'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
