import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Mic } from 'lucide-react';
import { Transaction } from '../types';

interface FinanceAIProps {
    onAddTransaction: (text: string) => Transaction | null;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    options?: string[]; // Add options support
}

const FinanceAI: React.FC<FinanceAIProps> = ({ onAddTransaction }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou seu assistente financeiro. Me conte sobre seus gastos ou ganhos. Exemplo: "Gastei 20 reais com almoço" ou "Recebi 1500 de salário".',
            timestamp: new Date()
        }
    ]);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Speech Recognition Setup
    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechChoice = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechChoice();
        recognitionRef.current = recognition;

        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        // Continuous is important for preventing it from stopping immediately in some browsers
        recognition.continuous = false;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log('Speech result:', transcript);
            setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Permissão de microfone negada. Verifique as configurações do seu navegador.');
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
            setIsListening(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleOptionClick = (option: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `Categoria: ${option}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        // This is a simplified flow - ideally we'd pass context about the pending transaction
        // For now, we'll just re-trigger the AI with this context
        setTimeout(() => {
            // In a real app we'd have state to track the "pending" transaction we are clarifying
            // Here we simulate checking if we can now fully resolve it.
            const combinedText = `${messages[messages.length - 1]?.content || ''} ${option}`; // Very naive context

            // However, onAddTransaction expects the full sentence to parse. 
            // To make this work robustly without refactoring the whole parser in App.tsx:
            // We will trust the user clicked the category of the LAST attempt.

            // Hack for demo: Just say we registered it, assuming the Parser works or valid fallback.
            // BETTER APPROACH: Let's assume the previous parsing failed or was incomplete.
            // We will synthesize a new sentence for the parser:

            // Actually, the request simplifies to: AI asks for category, user clicks button.
            // We need to re-parse or force the category.
            // Let's modify onAddTransaction slightly or just send a reconstructed sentence.

            // Let's construct a "stronger" sentence designed to pass the parser with the chosen category.
            // We need the *amount* from previous context.
            // Finding the amount in the previous message history:
            const lastAssistantMsg = messages[messages.length - 1];
            const lastUserMsg = messages[messages.length - 2];

            // Extract amount from last user message if possible
            const amountMatch = lastUserMsg?.content.match(/(?:R\$)?\s?(\d+(?:[.,]\d{1,2})?)/);
            const amount = amountMatch ? amountMatch[0] : '0';

            const syntheticCommand = `Gastei ${amount} em ${option}`;
            const transaction = onAddTransaction(syntheticCommand);

            if (transaction) {
                const formattedAmount = transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const responseContent = `Perfeito! Classifiquei a despesa de **${formattedAmount}** como **${transaction.category}**.`;

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                // Fallback
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Consegui anotar a categoria ${option}, mas confesso que me perdi no valor. Pode repetir o valor?`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            }

        }, 600);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Mic } from 'lucide-react';
import { Transaction } from '../types';

interface FinanceAIProps {
    onAddTransaction: (text: string) => Transaction | null;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    options?: string[];
}

const FinanceAI: React.FC<FinanceAIProps> = ({ onAddTransaction }) => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou seu assistente financeiro. Me conte sobre seus gastos ou ganhos. Exemplo: "Gastei 20 reais com almoço" ou "Recebi 1500 de salário".',
            timestamp: new Date()
        }
    ]);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Seu navegador não suporta reconhecimento de voz. Tente usar o Google Chrome.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const SpeechChoice = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechChoice();
        recognitionRef.current = recognition;

        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
            if (event.error === 'not-allowed') {
                alert('Permissão de microfone negada. Verifique as configurações do seu navegador.');
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        try {
            recognition.start();
        } catch (error) {
            console.error('Failed to start recognition:', error);
            setIsListening(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleOptionClick = (option: string) => {
        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `Categoria: ${option}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        setTimeout(() => {
            const lastUserMsg = messages[messages.length - 2];
            const amountMatch = lastUserMsg?.content.match(/(?:R\$)?\s?(\d+(?:[.,]\d{1,2})?)/);
            const amount = amountMatch ? amountMatch[0] : '0';

            const syntheticCommand = `Gastei ${amount} em ${option}`;
            const transaction = onAddTransaction(syntheticCommand);

            if (transaction) {
                const formattedAmount = transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const responseContent = `Perfeito! Classifiquei a despesa de **${formattedAmount}** como **${transaction.category}**.`;

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: responseContent,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `Consegui anotar a categoria ${option}, mas confesso que me perdi no valor. Pode repetir o valor?`,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        }, 600);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');

        setTimeout(() => {
            const transaction = onAddTransaction(userMsg.content);
            let responseContent = '';
            let options: string[] | undefined;

            if (transaction) {
                if (transaction.category === 'Geral' || transaction.category === 'Outros') {
                    const formattedAmount = transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    responseContent = `Entendi o valor de **${formattedAmount}**, mas fiquei na dúvida da categoria. Onde devo lançar?`;
                    options = ['Alimentação', 'Transporte', 'Lazer', 'Contas', 'Saúde'];
                } else {
                    const formattedAmount = transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    if (transaction.type === 'expense') {
                        responseContent = `Entendido. Registrei uma despesa de **${formattedAmount}** na categoria **${transaction.category}**.`;
                    } else {
                        responseContent = `Ótimo! Registrei uma receita de **${formattedAmount}** vinda de **${transaction.category}**.`;
                    }
                }
            } else {
                responseContent = 'Desculpe, não consegui entender o valor. Poderia tentar novamente? Ex: "Gastei 50 no mercado"';
            }

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
                options: options
            };
            setMessages(prev => [...prev, aiMsg]);
        }, 600);
    };

    return (
        <div className="flex flex-col h-full dashboard-card overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/[0.08] bg-[#0d1220]/80 backdrop-blur-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                    <Bot size={22} />
                </div>
                <div>
                    <h2 className="text-white font-extrabold text-base">Agente Financeiro IA</h2>
                    <p className="text-xs text-slate-400">Inteligência Artificial para controle de orçamento</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-transparent">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                                <Bot size={16} />
                            </div>
                        )}
                        <div className={`
                            max-w-[80%] p-4 rounded-3xl text-sm leading-relaxed shadow-lg
                            ${msg.role === 'user'
                                ? 'btn-glow-primary text-white rounded-tr-none font-medium'
                                : 'bg-[#101728]/80 border border-white/[0.08] backdrop-blur-xl text-slate-200 rounded-tl-none'
                            }
                        `}>
                            <p>{msg.content}</p>
                            <span className="text-[10px] opacity-50 mt-2 block">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.options && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleOptionClick(opt)}
                                            className="bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-xs px-3 py-1.5 rounded-xl border border-blue-500/30 transition-all font-semibold"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                                <UserIcon size={16} className="text-slate-300" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/[0.08] bg-[#0d1220]/80 backdrop-blur-xl flex items-center gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ex: Gastei R$ 45,00 no supermercado..."
                    className="flex-1 bg-[#121828]/90 border border-white/[0.08] text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-500 text-sm"
                />

                <button
                    type="button"
                    onClick={startListening}
                    className={`p-3 rounded-2xl transition-all ${
                        isListening
                            ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'bg-[#121828] text-slate-400 hover:text-white border border-white/[0.08]'
                    }`}
                    title="Voz para texto"
                >
                    <Mic size={20} />
                </button>

                <button
                    type="submit"
                    disabled={!input.trim()}
                    className="btn-glow-primary text-white p-3 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default FinanceAI;
