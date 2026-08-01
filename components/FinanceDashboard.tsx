import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Plus, Minus, ChevronLeft, ChevronRight, Target, X, PiggyBank, Calendar, Coins, Edit2, Trash2, Clock3 } from 'lucide-react';
import { Transaction, FinancialGoal, Budget, RecurringExpense } from '../types';

interface FinanceDashboardProps {
    transactions: Transaction[];
    goals: FinancialGoal[];
    budgets: Budget[];
    recurringExpenses: RecurringExpense[];
    currentDate: Date;
    onNavigateMonth: (direction: 'prev' | 'next') => void;
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'> & { date: Date, goalId?: string, goalContribution?: number }) => void;
    onAddGoal: (goal: Omit<FinancialGoal, 'id' | 'currentAmount'>) => void;
    onUpdateGoal: (goalId: string, amountDelta: number) => void;
    onAddBudget: (budget: Omit<Budget, 'id'>) => void;
    onAddRecurring: (rec: Omit<RecurringExpense, 'id'>) => void;
    onEditRecurring: (id: string, rec: Omit<RecurringExpense, 'id' | 'lastPaidDate'>) => void;
    onPayRecurring: (id: string, amount: number, date: Date) => void;
    onEditBudget: (id: string, newLimit: number) => void;
    onToggleRecurringPay: (id: string, isPaid: boolean, amount?: number, date?: Date) => void;
    onEditTransaction: (id: string, updatedTransaction: Partial<Transaction>) => void;
    onDeleteTransaction: (id: string) => void;
    onDeleteRecurring: (id: string) => void;
}

const getDateForDueDay = (year: number, month: number, dueDay: number) => {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(Math.max(dueDay, 1), lastDayOfMonth));
};

const getNextDueInfo = (dueDay: number, lastPaidDate?: Date) => {
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        return { countdown: 'Defina o vencimento', formattedDate: 'Data não definida' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidThisMonth = lastPaidDate
        && lastPaidDate.getMonth() === today.getMonth()
        && lastPaidDate.getFullYear() === today.getFullYear();

    let dueDate = getDateForDueDay(today.getFullYear(), today.getMonth(), dueDay);
    if (paidThisMonth || dueDate < today) {
        dueDate = getDateForDueDay(today.getFullYear(), today.getMonth() + 1, dueDay);
    }

    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const daysRemaining = Math.round((dueUtc - todayUtc) / 86_400_000);

    const countdown = daysRemaining === 0
        ? 'Vence hoje'
        : daysRemaining === 1
            ? 'Vence amanhã'
            : `Faltam ${daysRemaining} dias`;

    return {
        countdown,
        formattedDate: dueDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace('.', '')
    };
};

const FinanceDashboard: React.FC<FinanceDashboardProps> = ({
    transactions,
    goals,
    budgets,
    recurringExpenses,
    currentDate,
    onNavigateMonth,
    onAddTransaction,
    onAddGoal,
    onUpdateGoal,
    onAddBudget,
    onAddRecurring,
    onEditRecurring,
    onPayRecurring,
    onEditBudget,
    onToggleRecurringPay,
    onEditTransaction,
    onDeleteTransaction,
    onDeleteRecurring
}) => {
    // --- Local State for Modals ---
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');
    const [transAmount, setTransAmount] = useState('');
    const [transDesc, setTransDesc] = useState('');
    const [transCategory, setTransCategory] = useState('');

    const [selectedGoalId, setSelectedGoalId] = useState('');
    const [transGoalContribution, setTransGoalContribution] = useState('');

    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [goalName, setGoalName] = useState('');
    const [goalTarget, setGoalTarget] = useState('');

    const [goalUpdateModal, setGoalUpdateModal] = useState<{ isOpen: boolean; goalId: string; mode: 'add' | 'remove' }>({
        isOpen: false,
        goalId: '',
        mode: 'add'
    });
    const [goalUpdateAmount, setGoalUpdateAmount] = useState('');

    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetCategory, setBudgetCategory] = useState('');
    const [budgetLimit, setBudgetLimit] = useState('');

    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
    const [recurDesc, setRecurDesc] = useState('');
    const [recurCategory, setRecurCategory] = useState('');
    const [recurType, setRecurType] = useState<'fixed' | 'variable'>('fixed');
    const [recurAmount, setRecurAmount] = useState('');
    const [recurDay, setRecurDay] = useState('');
    const [recurInstallments, setRecurInstallments] = useState(''); // New state for installments
    const [editingRecurringId, setEditingRecurringId] = useState<string | null>(null);

    const [editBudgetModal, setEditBudgetModal] = useState<{ isOpen: boolean; budgetId: string; currentLimit: string }>({
        isOpen: false,
        budgetId: '',
        currentLimit: ''
    });

    const [variablePayModal, setVariablePayModal] = useState<{ isOpen: boolean; recurId: string; description: string }>({
        isOpen: false,
        recurId: '',
        description: ''
    });
    const [variablePayAmount, setVariablePayAmount] = useState('');

    const [editTransModal, setEditTransModal] = useState<{
        isOpen: boolean;
        id: string;
        description: string;
        amount: string;
        category: string;
        type: 'income' | 'expense';
        date: string; // ISO string for date input
    }>({
        isOpen: false,
        id: '',
        description: '',
        amount: '',
        category: '',
        type: 'expense',
        date: ''
    });

    // --- Filtered Data ---
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t =>
            t.date.getMonth() === currentDate.getMonth() &&
            t.date.getFullYear() === currentDate.getFullYear()
        );
    }, [transactions, currentDate]);

    // --- Calculations ---
    const { balance, totalIncome, totalExpense } = useMemo(() => {
        return filteredTransactions.reduce(
            (acc, t) => {
                if (t.type === 'income') {
                    acc.totalIncome += t.amount;
                    acc.balance += t.amount;
                } else {
                    acc.totalExpense += t.amount;
                    acc.balance -= t.amount;
                }
                return acc;
            },
            { balance: 0, totalIncome: 0, totalExpense: 0 }
        );
    }, [filteredTransactions]);

    const chartData = useMemo(() => {
        // Daily aggregation for the current month
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const data = Array.from({ length: daysInMonth }, (_, i) => {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            return {
                day: i + 1,
                date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                income: 0,
                expense: 0
            };
        });

        filteredTransactions.forEach(t => {
            const day = t.date.getDate();
            if (t.type === 'income') {
                data[day - 1].income += t.amount;
            } else {
                data[day - 1].expense += t.amount;
            }
        });

        return data;
    }, [filteredTransactions, currentDate]);

    // --- Handlers ---
    const handleSubmitTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transAmount || !transDesc) return;

        onAddTransaction({
            type: transType,
            amount: parseFloat(transAmount.replace(',', '.')),
            description: transDesc,
            category: transCategory || 'Geral',
            date: new Date(),
            goalId: (transType === 'income' && selectedGoalId) ? selectedGoalId : undefined,
            goalContribution: (transType === 'income' && selectedGoalId && transGoalContribution) ? parseFloat(transGoalContribution.replace(',', '.')) : undefined
        });

        setTransAmount('');
        setTransDesc('');
        setTransCategory('');
        setSelectedGoalId('');
        setTransGoalContribution('');
        setIsTransModalOpen(false);
    };

    const handleSubmitGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalName || !goalTarget) return;

        onAddGoal({
            name: goalName,
            targetAmount: parseFloat(goalTarget.replace(',', '.')),
        });

        setGoalName('');
        setGoalTarget('');
        setIsGoalModalOpen(false);
    };

    const handleOpenGoalUpdate = (goalId: string, mode: 'add' | 'remove') => {
        setGoalUpdateModal({ isOpen: true, goalId, mode });
        setGoalUpdateAmount('');
    };

    const handleSubmitGoalUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!goalUpdateAmount) return;

        const amount = parseFloat(goalUpdateAmount.replace(',', '.'));
        const delta = goalUpdateModal.mode === 'add' ? amount : -amount;

        onUpdateGoal(goalUpdateModal.goalId, delta);
        setGoalUpdateModal(prev => ({ ...prev, isOpen: false }));
        setGoalUpdateAmount('');
    };

    const handleSubmitBudget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!budgetCategory || !budgetLimit) return;
        onAddBudget({ category: budgetCategory, limit: parseFloat(budgetLimit.replace(',', '.')) });
        setBudgetCategory('');
        setBudgetLimit('');
        setIsBudgetModalOpen(false);
    };

    const handleSubmitRecurring = (e: React.FormEvent) => {
        e.preventDefault();
        if (!recurDesc || !recurCategory || !recurDay) return;
        const recurringData = {
            description: recurDesc,
            category: recurCategory,
            type: recurType,
            amount: recurAmount ? parseFloat(recurAmount.replace(',', '.')) : undefined,
            dayOfMonth: parseInt(recurDay),
            installmentsTotal: recurInstallments ? parseInt(recurInstallments) : undefined,
            currentInstallment: recurInstallments ? 1 : undefined
        };
        if (editingRecurringId) {
            const currentExpense = recurringExpenses.find(rec => rec.id === editingRecurringId);
            onEditRecurring(editingRecurringId, {
                ...recurringData,
                currentInstallment: recurringData.installmentsTotal
                    ? currentExpense?.currentInstallment || 1
                    : undefined
            });
        } else {
            onAddRecurring(recurringData);
        }
        setRecurDesc('');
        setRecurCategory('');
        setRecurType('fixed');
        setRecurAmount('');
        setRecurDay('');
        setRecurInstallments(''); // Reset installments state
        setEditingRecurringId(null);
        setIsRecurringModalOpen(false);
    };

    const openNewRecurringModal = () => {
        setEditingRecurringId(null);
        setRecurDesc('');
        setRecurCategory('');
        setRecurType('fixed');
        setRecurAmount('');
        setRecurDay('');
        setRecurInstallments('');
        setIsRecurringModalOpen(true);
    };

    const openEditRecurringModal = (rec: RecurringExpense) => {
        setEditingRecurringId(rec.id);
        setRecurDesc(rec.description);
        setRecurCategory(rec.category);
        setRecurType(rec.type);
        setRecurAmount(rec.amount?.toString() || '');
        setRecurDay(Number.isInteger(rec.dayOfMonth) ? rec.dayOfMonth.toString() : '');
        setRecurInstallments(rec.installmentsTotal?.toString() || '');
        setIsRecurringModalOpen(true);
    };

    const openTransModal = (type: 'income' | 'expense') => {
        setTransType(type);
        setSelectedGoalId('');
        setIsTransModalOpen(true);
    };

    const handleEditBudgetClick = (budget: Budget) => {
        setEditBudgetModal({
            isOpen: true,
            budgetId: budget.id,
            currentLimit: budget.limit.toString()
        });
    };

    const handleSubmitEditBudget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editBudgetModal.currentLimit) return;
        onEditBudget(editBudgetModal.budgetId, parseFloat(editBudgetModal.currentLimit.replace(',', '.')));
        setEditBudgetModal({ isOpen: false, budgetId: '', currentLimit: '' });
    };

    const handleRecurringClick = (rec: RecurringExpense, isPaid: boolean) => {
        if (isPaid) {
            // Undo payment
            // In a real app we might ask for confirmation
            onToggleRecurringPay(rec.id, false);
        } else {
            // Pay
            if (rec.type === 'variable') {
                setVariablePayModal({ isOpen: true, recurId: rec.id, description: rec.description });
                setVariablePayAmount('');
            } else {
                // Fixed - Pay immediately
                onToggleRecurringPay(rec.id, true, rec.amount || 0, new Date());
            }
        }
    };

    const handleSubmitVariablePay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!variablePayAmount) return;

        onToggleRecurringPay(
            variablePayModal.recurId,
            true,
            parseFloat(variablePayAmount.replace(',', '.')),
            new Date()
        );
        setVariablePayModal({ isOpen: false, recurId: '', description: '' });
        setVariablePayAmount('');
        setVariablePayModal({ isOpen: false, recurId: '', description: '' });
        setVariablePayAmount('');
    };

    const handleEditTransactionClick = (t: Transaction) => {
        setEditTransModal({
            isOpen: true,
            id: t.id,
            description: t.description,
            amount: t.amount.toString(),
            category: t.category,
            type: t.type,
            date: t.date.toISOString().split('T')[0]
        });
    };

    const handleSubmitEditTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTransModal.description || !editTransModal.amount) return;

        onEditTransaction(editTransModal.id, {
            description: editTransModal.description,
            amount: parseFloat(editTransModal.amount.replace(',', '.')),
            category: editTransModal.category,
            type: editTransModal.type,
            date: new Date(editTransModal.date + 'T12:00:00') // prevent timezone issues
        });
        setEditTransModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteTransaction = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
            onDeleteTransaction(id);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header with Navigation and Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <div className="p-2 icon-glow-red rounded-xl">
                            <Wallet size={28} />
                        </div>
                        Financeiro
                    </h1>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <button onClick={() => onNavigateMonth('prev')} className="p-1 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                        <span className="capitalize font-medium text-white">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => onNavigateMonth('next')} className="p-1 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => openTransModal('income')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all font-medium shadow-[0_0_18px_rgba(220,38,38,0.08)]"
                    >
                        <Plus size={18} />
                        Receita
                    </button>
                    <button
                        onClick={() => openTransModal('expense')}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-all font-medium"
                    >
                        <Minus size={18} />
                        Despesa
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#111111] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-red-500" />
                    </div>
                    <div className="mb-4">
                        <span className="text-zinc-500 font-medium text-sm uppercase tracking-wider">Saldo Mensal</span>
                    </div>
                    <h2 className={`text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>R$ {balance.toFixed(2)}</h2>
                </div>

                <div className="bg-[#111111] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight size={64} className="text-red-500" />
                    </div>
                    <span className="text-zinc-500 font-medium text-sm uppercase tracking-wider block mb-4">Entradas</span>
                    <h2 className="text-3xl font-bold text-blue-400">R$ {totalIncome.toFixed(2)}</h2>
                </div>

                <div className="bg-[#111111] border border-zinc-800 p-6 rounded-2xl relative overflow-hidden group hover:border-zinc-700 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowDownRight size={64} className="text-rose-500" />
                    </div>
                    <span className="text-zinc-500 font-medium text-sm uppercase tracking-wider block mb-4">Saídas</span>
                    <h2 className="text-3xl font-bold text-rose-400">R$ {totalExpense.toFixed(2)}</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="contents">
                {/* Main Chart */}
                <div className="lg:col-span-2 lg:order-1 bg-[#111111] border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-6">Fluxo de Caixa ({currentDate.toLocaleString('pt-BR', { month: 'long' })})</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="day" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: any) => [`R$ ${value}`, '']}
                                />
                                <Legend />
                                <Bar dataKey="income" name="Receitas" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                <Bar dataKey="expense" name="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Goals Section */}
                <div className="lg:col-span-2 lg:order-4 bg-[#111111] border border-zinc-800 rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">Metas Financeiras</h3>
                        <button onClick={() => setIsGoalModalOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {goals.length === 0 ? (
                            <div className="text-center text-zinc-600 py-6">
                                Nenhuma meta definida.
                            </div>
                        ) : (
                            goals.map(goal => {
                                const percentage = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                                return (
                                    <div key={goal.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-zinc-900 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <span className="font-medium text-white block">{goal.name}</span>
                                                <span className="text-xs text-zinc-500">R$ {goal.currentAmount} / {goal.targetAmount}</span>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenGoalUpdate(goal.id, 'remove')}
                                                    className="p-1 hover:bg-zinc-800 rounded text-rose-500"
                                                    title="Remover valor"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenGoalUpdate(goal.id, 'add')}
                                                    className="p-1 hover:bg-zinc-800 rounded text-emerald-500"
                                                    title="Adicionar valor"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 text-right">
                                            <span className="text-xs text-emerald-400 font-bold">{percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Budgets and Recurring Section */}
            <div className="contents">
                {/* Spending Goals (Budgets) */}
                <div className="lg:order-3 bg-[#111111] border border-zinc-800 rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Coins size={20} className="text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.35)]" /> Metas de Gastos
                        </h3>
                        <button onClick={() => setIsBudgetModalOpen(true)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {budgets.length === 0 ? (
                            <div className="text-center text-zinc-600 py-6">Nenhuma meta de gasto definida.</div>
                        ) : (
                            budgets.map(budget => {
                                const spent = filteredTransactions
                                    .filter(t => t.type === 'expense' && t.category === budget.category)
                                    .reduce((acc, t) => acc + t.amount, 0);
                                const percentage = Math.min(100, Math.round((spent / budget.limit) * 100));

                                return (
                                    <div key={budget.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-zinc-900 group">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-white">{budget.category}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-zinc-500">R$ {spent.toFixed(0)} / {budget.limit}</span>
                                                <button
                                                    onClick={() => handleEditBudgetClick(budget)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition-opacity"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${percentage > 90 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="mt-1 text-right">
                                            <span className={`text-xs font-bold ${percentage > 90 ? 'text-red-400' : 'text-emerald-400'}`}>{percentage}%</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Recurring Expenses */}
                <div className="lg:order-2 bg-[#111111] border border-zinc-800 rounded-2xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Calendar size={20} className="text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.35)]" /> Despesas Fixas
                        </h3>
                        <button onClick={openNewRecurringModal} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                            <Plus size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                        {recurringExpenses.length === 0 ? (
                            <div className="text-center text-zinc-600 py-6">Nenhuma despesa fixa.</div>
                        ) : (
                            recurringExpenses.map(rec => {
                                // Check if paid this month
                                const isPaid = rec.lastPaidDate &&
                                    rec.lastPaidDate.getMonth() === currentDate.getMonth() &&
                                    rec.lastPaidDate.getFullYear() === currentDate.getFullYear();
                                const nextDue = getNextDueInfo(rec.dayOfMonth, rec.lastPaidDate);

                                return (
                                    <div key={rec.id} className="bg-[#1a1a1a] p-3 rounded-lg border border-zinc-900 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 group hover:border-red-900/30 transition-colors">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium">{rec.description}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${rec.type === 'fixed' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                    {rec.type === 'fixed' ? 'Fixa' : 'Variável'}
                                                </span>
                                                {rec.installmentsTotal && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-zinc-800 text-zinc-400">
                                                        {rec.currentInstallment || 1}/{rec.installmentsTotal}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 text-zinc-400">
                                                    <Calendar size={11} className="text-red-400" />
                                                    {nextDue.formattedDate}
                                                </span>
                                                <span>•</span>
                                                <span>{rec.category}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-3">
                                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-red-300 bg-red-500/5 border border-red-500/10 rounded-md px-2 py-1 whitespace-nowrap">
                                                <Clock3 size={12} />
                                                {nextDue.countdown}
                                            </div>
                                            {rec.amount && <span className="text-sm font-bold text-zinc-300">R$ {rec.amount}</span>}
                                            {isPaid ? (
                                                <button
                                                    onClick={() => handleRecurringClick(rec, !!isPaid)}
                                                    className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded hover:bg-red-500/10 hover:text-red-500 group/btn transition-colors"
                                                    title="Desfazer pagamento"
                                                >
                                                    <span className="group-hover/btn:hidden">PAGO</span>
                                                    <span className="hidden group-hover/btn:inline text-[10px]">DESFAZER</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleRecurringClick(rec, !!isPaid)}
                                                    className="text-xs px-3 py-1.5 rounded transition-colors bg-zinc-800 hover:bg-zinc-700 text-white"
                                                >
                                                    Pagar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditRecurringModal(rec)}
                                                className="p-1.5 hover:bg-red-500/10 rounded text-zinc-600 hover:text-red-400 transition-colors"
                                                title="Editar despesa"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteRecurring(rec.id)}
                                                className="p-1.5 hover:bg-red-500/10 rounded text-zinc-600 hover:text-red-500 transition-colors"
                                                title="Excluir despesa"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
            </div>

            {/* Transaction List */}
            <div className="bg-[#111111] border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Transações do Mês</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                                <th className="pb-3 text-left pl-4">Data</th>
                                <th className="pb-3 text-left">Descrição</th>
                                <th className="pb-3 text-left">Categoria</th>
                                <th className="pb-3 text-right">Valor</th>
                                <th className="pb-3 pr-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-zinc-600">Nenhuma transação neste mês.</td>
                                </tr>
                            ) : (
                                filteredTransactions.slice().sort((a, b) => b.date.getTime() - a.date.getTime()).map((t) => (
                                    <tr key={t.id} className="group hover:bg-zinc-900/50 transition-colors">
                                        <td className="py-4 pl-4 text-zinc-400 text-sm">{t.date.toLocaleDateString('pt-BR')}</td>
                                        <td className="py-4 text-white font-medium">{t.description}</td>
                                        <td className="py-4 text-zinc-500 text-sm">{t.category}</td>
                                        <td className={`py-4 text-right font-bold ${t.type === 'income' ? 'text-blue-400' : 'text-rose-400'}`}>
                                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                        </td>
                                        <td className="py-4 pr-4 text-right flex justify-end gap-2">
                                            <button onClick={() => handleEditTransactionClick(t)} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Editar">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteTransaction(t.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-colors" title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {
                isTransModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                                <h3 className="text-lg font-bold text-white">Nova {transType === 'income' ? 'Receita' : 'Despesa'}</h3>
                                <button onClick={() => setIsTransModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmitTransaction} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Descrição</label>
                                        <input
                                            type="text"
                                            value={transDesc}
                                            onChange={e => setTransDesc(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="Ex: Salário, Aluguel..."
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor (R$)</label>
                                        <input
                                            type="number"
                                            value={transAmount}
                                            onChange={e => setTransAmount(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="0,00"
                                            step="0.01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Categoria</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={transCategory}
                                                onChange={e => setTransCategory(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600 appearance-none"
                                            >
                                                <option value="">Selecione ou digite...</option>
                                                {/* Predefined from Budgets */}
                                                {budgets.map(b => (
                                                    <option key={b.id} value={b.category}>{b.category}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={transCategory}
                                                onChange={e => setTransCategory(e.target.value)}
                                                className="w-1/2 bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600 placeholder:text-zinc-700"
                                                placeholder="Outra..."
                                            />
                                        </div>
                                    </div>

                                    {/* Goal Selection for Income */}
                                    {transType === 'income' && goals.length > 0 && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                            <label className="block text-xs font-bold text-emerald-500 uppercase mb-2 flex items-center gap-2">
                                                <PiggyBank size={14} /> Destinar para Meta (Opcional)
                                            </label>
                                            <select
                                                value={selectedGoalId}
                                                onChange={e => setSelectedGoalId(e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-emerald-500/30 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500"
                                            >
                                                <option value="">Nenhuma</option>
                                                {goals.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>

                                            {selectedGoalId && (
                                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-2">Valor para Destinar (R$)</label>
                                                    <input
                                                        type="number"
                                                        placeholder={`Total: ${transAmount || '0,00'}`}
                                                        value={transGoalContribution}
                                                        onChange={e => setTransGoalContribution(e.target.value)}
                                                        className="w-full bg-[#1a1a1a] border border-emerald-500/30 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500"
                                                        step="0.01"
                                                    />
                                                    <p className="text-[10px] text-emerald-500/60 mt-1">
                                                        Deixe vazio para usar o valor total.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsTransModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                    <button type="submit" disabled={!transAmount || !transDesc} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isGoalModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                                <h3 className="text-lg font-bold text-white">Nova Meta Financeira</h3>
                                <button onClick={() => setIsGoalModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmitGoal} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nome da Meta</label>
                                        <input
                                            type="text"
                                            value={goalName}
                                            onChange={e => setGoalName(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="Ex: Viagem, Carro Novo..."
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor Alvo (R$)</label>
                                        <input
                                            type="number"
                                            value={goalTarget}
                                            onChange={e => setGoalTarget(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="0,00"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setIsGoalModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                    <button type="submit" disabled={!goalName || !goalTarget} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold">Criar Meta</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                goalUpdateModal.isOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                                <h3 className="text-lg font-bold text-white">
                                    {goalUpdateModal.mode === 'add' ? 'Adicionar Valor' : 'Remover Valor'}
                                </h3>
                                <button onClick={() => setGoalUpdateModal(prev => ({ ...prev, isOpen: false }))} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmitGoalUpdate} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor (R$)</label>
                                        <input
                                            type="number"
                                            value={goalUpdateAmount}
                                            onChange={e => setGoalUpdateAmount(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-emerald-600"
                                            placeholder="0,00"
                                            step="0.01"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button type="button" onClick={() => setGoalUpdateModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                    <button
                                        type="submit"
                                        disabled={!goalUpdateAmount}
                                        className={`px-6 py-2 rounded-lg font-bold text-white ${goalUpdateModal.mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                            }`}
                                    >
                                        Confirmar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Budget Modal */}
            {isBudgetModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                            <h3 className="text-lg font-bold text-white">Nova Meta de Gasto (Categoria)</h3>
                            <button onClick={() => setIsBudgetModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitBudget} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Nome da Categoria</label>
                                    <input
                                        type="text"
                                        value={budgetCategory}
                                        onChange={e => setBudgetCategory(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                        placeholder="Ex: Alimentação, Lazer..."
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Limite Mensal (R$)</label>
                                    <input
                                        type="number"
                                        value={budgetLimit}
                                        onChange={e => setBudgetLimit(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={!budgetCategory || !budgetLimit} className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recurring Modal */}
            {isRecurringModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                            <h3 className="text-lg font-bold text-white">Nova Despesa Fixa/Variável</h3>
                            <button onClick={() => setIsRecurringModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitRecurring} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Descrição</label>
                                    <input
                                        type="text"
                                        value={recurDesc}
                                        onChange={e => setRecurDesc(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                        placeholder="Ex: Aluguel, Internet..."
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Categoria</label>
                                    <input
                                        type="text"
                                        value={recurCategory}
                                        onChange={e => setRecurCategory(e.target.value)}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                        placeholder="Ex: Moradia"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Tipo</label>
                                        <select
                                            value={recurType}
                                            onChange={e => setRecurType(e.target.value as 'fixed' | 'variable')}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                        >
                                            <option value="fixed">Fixa (Valor Igual)</option>
                                            <option value="variable">Variável (Valor Muda)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Dia do Vencimento</label>
                                        <input
                                            type="number"
                                            value={recurDay}
                                            onChange={e => setRecurDay(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="Dia"
                                            min="1" max="31"
                                        />
                                    </div>
                                </div>
                                {recurType === 'fixed' && (
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor (R$)</label>
                                        <input
                                            type="number"
                                            value={recurAmount}
                                            onChange={e => setRecurAmount(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600 mb-4"
                                            placeholder="0,00"
                                        />
                                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">N° de Parcelas (Opcional)</label>
                                        <input
                                            type="number"
                                            value={recurInstallments}
                                            onChange={e => setRecurInstallments(e.target.value)}
                                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                            placeholder="Ex: 12"
                                            min="1"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsRecurringModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={!recurDesc || !recurCategory || !recurDay} className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Variable Pay Modal */}
            {variablePayModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                            <h3 className="text-lg font-bold text-white">Pagar {variablePayModal.description}</h3>
                            <button onClick={() => setVariablePayModal(prev => ({ ...prev, isOpen: false }))} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitVariablePay} className="p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor Pago (R$)</label>
                                <input
                                    type="number"
                                    value={variablePayAmount}
                                    onChange={e => setVariablePayAmount(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-emerald-600"
                                    placeholder="0,00"
                                    step="0.01"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setVariablePayModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={!variablePayAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold">Confirmar Pagamento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Budget Modal */}
            {editBudgetModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                            <h3 className="text-lg font-bold text-white">Editar Limite de Gasto</h3>
                            <button onClick={() => setEditBudgetModal(prev => ({ ...prev, isOpen: false }))} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitEditBudget} className="p-6">
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Novo Limite (R$)</label>
                                <input
                                    type="number"
                                    value={editBudgetModal.currentLimit}
                                    onChange={e => setEditBudgetModal(prev => ({ ...prev, currentLimit: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-red-600"
                                    placeholder="0,00"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setEditBudgetModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                <button type="submit" disabled={!editBudgetModal.currentLimit} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold">Salvar Alteração</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {editTransModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                            <h3 className="text-lg font-bold text-white">Editar Transação</h3>
                            <button onClick={() => setEditTransModal(prev => ({ ...prev, isOpen: false }))} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitEditTransaction} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Descrição</label>
                                <input
                                    type="text"
                                    value={editTransModal.description}
                                    onChange={e => setEditTransModal(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-blue-600"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Valor (R$)</label>
                                    <input
                                        type="number"
                                        value={editTransModal.amount}
                                        onChange={e => setEditTransModal(prev => ({ ...prev, amount: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-blue-600"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Data</label>
                                    <input
                                        type="date"
                                        value={editTransModal.date}
                                        onChange={e => setEditTransModal(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-blue-600"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Categoria</label>
                                <input
                                    type="text"
                                    value={editTransModal.category}
                                    onChange={e => setEditTransModal(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:border-blue-600"
                                    list="categories-list"
                                />
                                <datalist id="categories-list">
                                    {budgets.map(b => <option key={b.id} value={b.category} />)}
                                    <option value="Geral" />
                                </datalist>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setEditTransModal(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 text-zinc-400 hover:text-white">Cancelar</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;
