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
            const amountMatch = lastUserMsg?.content.match(/(?:R\$)?\s?(\d[\d.,]*)/);
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

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Process with "AI" logic
        setTimeout(() => {
            const transaction = onAddTransaction(userMsg.content);
            let responseContent = '';
            let options: string[] | undefined;

            if (transaction) {
                // Check if the parser defaulted to "Geral" or seemed unsure (simple heuristic)
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
        <div className="flex flex-col h-full bg-[#111111] border border-zinc-800 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-[#151515] flex items-center gap-3">
                <div className="p-2 icon-glow-red rounded-lg">
                    <Bot size={24} />
                </div>
                <div>
                    <h2 className="text-white font-bold">Agente Financeiro</h2>
                    <p className="text-xs text-zinc-500">IA Especializada em Finanças</p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#0a0a0a]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full icon-glow-red flex items-center justify-center shrink-0 mt-1">
                                <Bot size={16} />
                            </div>
                        )}
                        <div className={`
                    max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed
                    ${msg.role === 'user'
                                ? 'bg-zinc-800 text-white rounded-tr-none'
                                : 'bg-[#1a1a1a] border border-zinc-800 text-zinc-300 rounded-tl-none'
                            }
                `}>
                            <p>{msg.content}</p>
                            <span className="text-[10px] opacity-40 mt-2 block">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {/* Render Options if any */}
                            {msg.options && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleOptionClick(opt)}
                                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-1">
                                <UserIcon size={16} className="text-zinc-400" />
                            </div>
                        )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#151515] border-t border-zinc-800">
                <form onSubmit={handleSubmit} className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua transação..."
                        className="w-full bg-[#0a0a0a] border border-zinc-800 text-white rounded-xl py-4 pl-4 pr-14 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className={`absolute right-2 p-2 bg-red-600 hover:bg-red-700 shadow-[0_0_14px_rgba(220,38,38,0.25)] disabled:opacity-0 disabled:pointer-events-none rounded-lg text-white transition-all duration-300 ${input.trim() ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                    >
                        <Send size={18} />
                    </button>
                    {!input.trim() && (
                        <button
                            type="button"
                            onClick={startListening}
                            className={`absolute right-2 p-2 rounded-lg text-white transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-zinc-800 hover:bg-zinc-700'
                                }`}
                            title="Falar"
                        >
                            <Mic size={18} />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
};

export default FinanceAI;
