import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Book,
  Activity,
  Moon,
  Coffee,
  X,
  Zap,
  Music,
  User,
  Edit2,
  Trash2,
  Briefcase,
  Calendar,
  Circle
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import MobileNavigation from './components/MobileNavigation';
import HabitChart from './components/HabitChart';
import HabitGrid from './components/HabitGrid';
import StatsCards from './components/StatsCards';
import FinanceDashboard from './components/FinanceDashboard';
import FinanceAI from './components/FinanceAI';
import WeeklyKanban from './components/WeeklyKanban';
import { Habit, ChartDataPoint, Transaction, FinancialGoal, Budget, RecurringExpense, DailyTask } from './types';

// Helper to format date keys for storage
const getDateKey = (habitId: number, date: Date) => {
  return `${habitId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// ... imports
import Auth from './components/Auth';
import { supabase } from './lib/supabase';

// ... (other imports remain the same)

// ... imports
// Force update
import { useSupabaseData } from './hooks/useSupabaseFetch';
// ...

const App: React.FC = () => {
  // --- Auth State ---
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Data Hook ---
  const {
    loading: dataLoading,
    habits: habitDefs, setHabits: setHabitDefs,
    completions: completionsMap, setCompletions: setCompletionsMap,
    transactions, setTransactions,
    goals: financialGoals, setGoals: setFinancialGoals,
    budgets, setBudgets,
    recurring: recurringExpenses, setRecurring: setRecurringExpenses,
    tasks: dailyTasks, setTasks: setDailyTasks
  } = useSupabaseData(session);

  // --- UI State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activePage, setActivePage] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [isNewSectionMode, setIsNewSectionMode] = useState(false);
  const [activeHabit, setActiveHabit] = useState<Habit | null>(null);
  const [habitAction, setHabitAction] = useState<'options' | 'rename' | 'delete' | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [financeDate, setFinanceDate] = useState(new Date());

  // --- Auth Effect ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Conditional Returns moved to bottom ---

  // --- Derived Values ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const dayLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Highlight "today" only if looking at the current month
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
  const currentDayHighlight = isCurrentMonth ? today.getDate() : -1;

  // --- Handlers ---

  // Visual Weekly Calendar Logic (Moved to Top Level)
  const weekOverview = useMemo(() => {
    const todayObj = new Date();
    const currentDay = todayObj.getDay(); // 0-6
    const startOfWeek = new Date(todayObj);
    startOfWeek.setDate(todayObj.getDate() - currentDay); // Go back to Sunday

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d,
        isToday: d.toDateString() === todayObj.toDateString(),
        dayStr: d.getDate().toString().padStart(2, '0'),
        monthStr: (d.getMonth() + 1).toString().padStart(2, '0'),
        weekDay: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).replace('.', '')
      };
    });
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const toggleHabit = async (habitId: number, dayIndex: number) => {
    if (!session?.user?.id) return;

    const date = new Date(currentDate);
    date.setDate(dayIndex + 1);

    // Format for DB: YYYY-MM-DD (Local Time)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const key = getDateKey(habitId, date);

    const isCompleted = !!completionsMap[key];

    // Optimistic Update
    setCompletionsMap(prev => {
      const newMap = { ...prev };
      if (isCompleted) {
        delete newMap[key];
      } else {
        newMap[key] = true;
      }
      return newMap;
    });

    try {
      if (isCompleted) {
        // Delete completion
        const { error } = await supabase
          .from('habit_completions')
          .delete()
          .match({ habit_id: habitId, completed_date: dateStr }); // Correct column name

        if (error) throw error;
      } else {
        // Insert completion
        const { error } = await supabase
          .from('habit_completions')
          .insert({
            habit_id: habitId,
            user_id: session.user.id,
            completed_date: dateStr // Correct column name
          });

        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling habit:', err);
      // Revert on error
      setCompletionsMap(prev => ({
        ...prev,
        [key]: isCompleted
      }));
      // Show error to user only if it's not a known safe error
      if (err.code !== 'PGRST116') { // Ignore empty result errors if any
        alert(`Erro ao salvar progresso: ${err.message || 'Verifique sua conexão'}`);
      }
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !session?.user?.id) return;

    const colors = ['text-pink-400', 'text-cyan-400', 'text-lime-400', 'text-rose-400'];
    const icons = ['Circle']; // Store string name for DB

    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomIcon = icons[0];
    const sectionToUse = newSectionName.trim() || 'Hábito';

    // Temporary ID for optimistic UI (will be replaced by real ID after fetch, or we update it now)
    // Actually, best to wait for DB response to get real ID to avoid key mismatches

    try {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: session.user.id,
          name: newHabitName,
          icon: randomIcon, // sending string
          color: randomColor,
          section: sectionToUse
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // success
        const newHabit: Habit = {
          id: data.id,
          name: data.name,
          icon: <Circle size={12} fill="currentColor" />, // rendered component
          color: data.color,
          section: data.section,
          completions: [] // init empty
        };

        setHabitDefs([...habitDefs, newHabit]);
        setNewHabitName('');
        setNewSectionName('');
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating habit:', err);
      alert('Erro ao criar hábito. Tente novamente.');
    }
  };

  const handleHabitClick = (habit: Habit) => {
    setActiveHabit(habit);
    setHabitAction('options');
  };

  const startRename = () => {
    if (activeHabit) {
      setRenameText(activeHabit.name);
      setHabitAction('rename');
    }
  };

  const startDelete = () => {
    setDeleteConfirmText('');
    setHabitAction('delete');
  };

  const closeHabitModal = () => {
    setActiveHabit(null);
    setHabitAction(null);
    setRenameText('');
    setDeleteConfirmText('');
  };

  const confirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHabit || !renameText.trim()) return;

    // Optimistic
    setHabitDefs(prev => prev.map(h =>
      h.id === activeHabit.id ? { ...h, name: renameText } : h
    ));
    closeHabitModal();

    try {
      const { error } = await supabase
        .from('habits')
        .update({ name: renameText })
        .eq('id', activeHabit.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error renaming habit:', err);
      // Could revert here if needed
    }
  };

  const confirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHabit || deleteConfirmText.toLowerCase() !== 'excluir') return;

    // Optimistic
    setHabitDefs(prev => prev.filter(h => h.id !== activeHabit.id));
    // Cleanup completions map locally
    setCompletionsMap(prev => {
      const newMap = { ...prev };
      Object.keys(newMap).forEach(key => {
        if (key.startsWith(`${activeHabit.id}-`)) {
          delete newMap[key];
        }
      });
      return newMap;
    });

    closeHabitModal();

    try {
      const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', activeHabit.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error deleting habit:', err);
      alert('Erro ao excluir hábito do banco de dados.');
    }
  };



  // --- Kanban Handlers ---
  const handleAddDailyTask = async (day: string, text: string) => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase.from('daily_tasks').insert({
        user_id: session.user.id,
        day,
        text,
        completed: false
      }).select().single();

      if (error) throw error;
      if (data) setDailyTasks(prev => [...prev, data]);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleDeleteDailyTask = async (taskId: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId)); // Optimistic
    try {
      const { error } = await supabase.from('daily_tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleToggleDailyTask = async (taskId: string) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (!task) return;

    setDailyTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )); // Optimistic

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleMoveDailyTask = async (taskId: string, newDay: string) => {
    setDailyTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, day: newDay } : t
    )); // Optimistic

    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update({ day: newDay })
        .eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      console.error('Error moving task:', err);
    }
  };

  // --- Financial Handlers ---

  const addTransactionFromAI = async (text: string): Promise<Transaction | null> => {
    if (!session?.user?.id) return null;
    const lowerText = text.toLowerCase();
    const stopWords = ['reais', 'real', 'pila', 'pilas', 'conto', 'contos', 'com', 'no', 'na', 'de', 'em', 'para', 'o', 'a', 'os', 'as', 'um', 'uma', 'brl', 'r$'];
    const expenseKeywords = ['gastei', 'paguei', 'compra', 'despesa', 'perdi', 'saída', 'pagamento'];
    const incomeKeywords = ['recebi', 'ganhei', 'venda', 'salário', 'depósito', 'entrada', 'lucro'];

    let type: 'income' | 'expense' = 'expense';
    let amount = 0;
    let category = 'Geral';
    let description = 'Transação Automática';

    // 1. Determine Type
    if (expenseKeywords.some(k => lowerText.includes(k))) type = 'expense';
    else if (incomeKeywords.some(k => lowerText.includes(k))) type = 'income';

    // 2. Extract Amount
    const amountMatch = text.match(/(?:R\$|BRL)?\s?(\d+(?:[.,]\d{1,2})?)/i);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    } else {
      return null;
    }

    // 3. Extract Category/Description (Simplified for brevity)
    let cleanText = lowerText.replace(/(?:R\$|BRL)?\s?(\d+(?:[.,]\d{1,2})?)/i, '').replace(/[.,!?;:]/g, ' ');
    let cleanTextParts = cleanText.split(' ').map(w => w.trim()).filter(word => !stopWords.includes(word) && !expenseKeywords.includes(word) && !incomeKeywords.includes(word) && word.length > 0);

    if (cleanTextParts.length > 0) {
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
      const categoryMap: Record<string, string> = {
        'almoço': 'Alimentação', 'jantar': 'Alimentação', 'lanche': 'Alimentação', 'mercado': 'Alimentação',
        'uber': 'Transporte', 'gasolina': 'Transporte',
        'luz': 'Contas', 'água': 'Contas',
        'aluguel': 'Moradia'
      };
      const firstWord = cleanTextParts[0];
      category = categoryMap[firstWord] || capitalize(firstWord);
      description = cleanTextParts.map(capitalize).join(' ');
    } else {
      description = type === 'expense' ? 'Despesa Diversa' : 'Receita Diversa';
    }

    try {
      const { data, error } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        type, amount, category, description,
        date: new Date().toISOString()
      }).select().single();

      if (error) throw error;
      if (data) {
        const newTrans = { ...data, date: new Date(data.date) };
        setTransactions(prev => [...prev, newTrans]);
        return newTrans;
      }
    } catch (err) {
      console.error('Error adding AI transaction:', err);
    }
    return null;
  };

  const handleUpdateGoal = async (goalId: string, amountDelta: number) => {
    const goal = financialGoals.find(g => g.id === goalId);
    if (!goal) return;

    const newAmount = Math.max(0, (goal.currentAmount || 0) + amountDelta);

    // Optimistic
    setFinancialGoals(prev => prev.map(g => g.id === goalId ? { ...g, currentAmount: newAmount } : g));

    try {
      const { error } = await supabase.from('financial_goals').update({
        current_amount: newAmount
      }).eq('id', goalId);
      if (error) throw error;
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  const handleAddTransactionManual = async (data: Omit<Transaction, 'id' | 'date'> & { date: Date, goalId?: string, goalContribution?: number }) => {
    if (!session?.user?.id) return;

    // BUG FIX #2: Desestruturar para remover goalId e goalContribution antes do insert
    // (essas colunas não existem na tabela 'transactions')
    const { goalId, goalContribution, ...transactionData } = data;

    try {
      // 1. Insert Transaction (apenas campos válidos da tabela)
      const { data: transData, error: transError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: transactionData.type,
        amount: transactionData.amount,
        category: transactionData.category,
        description: transactionData.description,
        date: transactionData.date.toISOString(),
      }).select().single();

      if (transError) throw transError;
      if (transData) {
        setTransactions(prev => [...prev, { ...transData, date: new Date(transData.date) }]);
      }

      // 2. Update Goal if needed
      if (goalId && data.type === 'income') {
        const contribution = goalContribution !== undefined ? goalContribution : data.amount;
        await handleUpdateGoal(goalId, contribution);
      }
    } catch (err) {
      console.error('Error adding manual transaction:', err);
    }
  };

  const handleAddGoal = async (data: Omit<FinancialGoal, 'id' | 'currentAmount'>) => {
    if (!session?.user?.id) return;
    try {
      // BUG FIX #3: Salvar o ícone como string no banco.
      // ReactNodes não podem ser persistidos — extraímos o nome da string
      // se vier como string, ou salvamos um default.
      const iconName = typeof data.icon === 'string' ? data.icon : 'Star';

      const { data: goalData, error } = await supabase.from('financial_goals').insert({
        user_id: session.user.id,
        name: data.name,
        target_amount: data.targetAmount,
        deadline: data.deadline ? (data.deadline instanceof Date ? data.deadline.toISOString() : data.deadline) : null,
        icon: iconName,
        color: data.color,
        current_amount: 0
      }).select().single();

      if (error) throw error;
      if (goalData) {
        const newGoal: FinancialGoal = {
          id: goalData.id,
          name: goalData.name,
          targetAmount: goalData.target_amount,
          currentAmount: goalData.current_amount,
          deadline: goalData.deadline ? new Date(goalData.deadline) : undefined,
          icon: goalData.icon || 'Star', // Retorna a string salva
          color: goalData.color
        };
        setFinancialGoals(prev => [...prev, newGoal]);
      }
    } catch (err) {
      console.error('Error adding goal:', err);
    }
  };

  const handleNavigateFinanceMonth = (direction: 'prev' | 'next') => {
    setFinanceDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleAddBudget = async (budget: Omit<Budget, 'id'>) => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase.from('budgets').insert({
        user_id: session.user.id,
        category: budget.category,
        limit: budget.limit
      }).select().single();

      if (error) throw error;
      if (data) setBudgets(prev => [...prev, data]);
    } catch (err) { console.error(err); }
  };

  const handleAddRecurring = async (rec: Omit<RecurringExpense, 'id'>) => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase.from('recurring_expenses').insert({
        user_id: session.user.id,
        description: rec.description,
        amount: rec.amount,
        category: rec.category,
        due_day: rec.dayOfMonth,
        installments_total: rec.installmentsTotal,
        current_installment: rec.currentInstallment,
        type: rec.type
      }).select().single();

      if (error) throw error;
      if (data) {
        setRecurringExpenses(prev => [...prev, {
          ...data,
          dayOfMonth: data.due_day,
          lastPaidDate: data.last_paid_date ? new Date(data.last_paid_date) : undefined,
          installmentsTotal: data.installments_total,
          currentInstallment: data.current_installment
        }]);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar despesa: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handlePayRecurring = async (id: string, amount: number, date: Date) => {
    const expense = recurringExpenses.find(r => r.id === id);
    if (!expense) return;

    // 1. Add Transaction
    const recDesc = expense.description + ' (Recorrente)';
    try {
      const { data: transData, error: transError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        type: 'expense',
        amount,
        category: expense.category,
        description: recDesc,
        date: date.toISOString()
      }).select().single();

      if (transError) throw transError;
      if (transData) setTransactions(prev => [...prev, { ...transData, date: new Date(transData.date) }]);

      // 2. Update Recurring
      const updates: any = { last_paid_date: date.toISOString() };
      let newCurrentInstallment = expense.currentInstallment;

      if (expense.installmentsTotal && expense.currentInstallment && expense.currentInstallment < expense.installmentsTotal) {
        newCurrentInstallment = expense.currentInstallment + 1;
        updates.current_installment = newCurrentInstallment;
      }

      const { error: recError } = await supabase.from('recurring_expenses').update(updates).eq('id', id);

      if (recError) throw recError;

      setRecurringExpenses(prev => prev.map(r => r.id === id ? {
        ...r,
        lastPaidDate: date,
        currentInstallment: newCurrentInstallment
      } : r));


    } catch (err) { console.error(err); }
  };

  const handleEditBudget = async (id: string, newLimit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit: newLimit } : b));
    try {
      await supabase.from('budgets').update({ limit: newLimit }).eq('id', id);
    } catch (err) { console.error(err); }
  };

  const handleEditTransaction = async (id: string, updatedTransaction: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedTransaction } : t));
    try {
      // BUG FIX #1: Serializar o campo `date` para string ISO antes de enviar ao Supabase.
      // Passar um objeto Date diretamente causaria dados corrompidos no banco.
      const payload: Record<string, any> = { ...updatedTransaction };
      if (payload.date instanceof Date) {
        payload.date = payload.date.toISOString();
      }
      const { error } = await supabase.from('transactions').update(payload).eq('id', id);
      if (error) throw error;
    } catch (err) { console.error('Error editing transaction:', err); }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (err) { console.error(err); }
  };

  /* New: Delete Handler */
  const handleDeleteRecurring = async (id: string) => {
    if (!window.confirm('Excluir esta despesa recorrente?')) return;
    setRecurringExpenses(prev => prev.filter(r => r.id !== id));
    try {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
      if (error) throw error;
    } catch (err) { console.error(err); alert('Erro ao excluir despesa.'); }
  };

  const handleToggleRecurringPay = async (id: string, isPaid: boolean, amount?: number, date?: Date) => {
    if (isPaid && date && amount !== undefined) {
      handlePayRecurring(id, amount, date);
    } else {
      // Unpay logic (Undo)
      const expense = recurringExpenses.find(r => r.id === id);
      if (!expense) return;

      const updates: any = { last_paid_date: null };
      let newCurrentInstallment = expense.currentInstallment;

      // If it was an installment payment, revert the increment
      if (expense.installmentsTotal && expense.currentInstallment && expense.currentInstallment > 1) {
        newCurrentInstallment = expense.currentInstallment - 1;
        updates.current_installment = newCurrentInstallment;
      }

      // Optimistic update
      setRecurringExpenses(prev => prev.map(r => r.id === id ? {
        ...r,
        lastPaidDate: undefined,
        currentInstallment: newCurrentInstallment
      } : r));

      // BUG FIX #4: Substituído alert() bloqueante por mensagem no console.
      // O aviso ao usuário deve ser implementado com um toast/snackbar na UI.
      console.warn('[HabitPulse] Pagamento revertido. Verifique se existe uma transação duplicada no Extrato e exclua-a se necessário.');

      try {
        const { error } = await supabase.from('recurring_expenses').update(updates).eq('id', id);
        if (error) throw error;
      } catch (err) { console.error(err); }
    }
  };



  // --- Data Construction ---

  // Build the `Habit` objects expected by child components dynamically based on current month
  const currentMonthHabits: Habit[] = useMemo(() => {
    return habitDefs.map(habit => {
      const completions = new Array(daysInMonth).fill(false);
      for (let i = 0; i < daysInMonth; i++) {
        const date = new Date(currentDate);
        date.setDate(i + 1);
        const key = getDateKey(habit.id, date);
        if (completionsMap[key]) {
          completions[i] = true;
        }
      }
      return {
        ...habit,
        completions
      };
    });
  }, [habitDefs, completionsMap, currentDate, daysInMonth]);

  // Group habits by section
  const sections = useMemo(() => {
    const grouped: Record<string, Habit[]> = {};
    currentMonthHabits.forEach(habit => {
      const sec = habit.section || 'Hábito';
      if (!grouped[sec]) {
        grouped[sec] = [];
      }
      grouped[sec].push(habit);
    });
    return grouped;
  }, [currentMonthHabits]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    return dayLabels.map((day, dayIndex) => {
      const completedCount = currentMonthHabits.reduce((acc, habit) => acc + (habit.completions[dayIndex] ? 1 : 0), 0);
      return {
        day,
        percentage: currentMonthHabits.length > 0 ? (completedCount / currentMonthHabits.length) * 100 : 0
      };
    });
  }, [currentMonthHabits, dayLabels]);

  const monthAverage = useMemo(() => {
    const sum = chartData.reduce((a, b) => a + b.percentage, 0);
    return chartData.length > 0 ? sum / chartData.length : 0;
  }, [chartData]);

  // Statistics
  const todayCompletedCount = currentMonthHabits.reduce((acc, h) => {
    // Only count "today" if we are in the current month
    if (!isCurrentMonth) return 0;
    return acc + (h.completions[today.getDate() - 1] ? 1 : 0);
  }, 0);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const checkDate = new Date(); // Start from today

    // Check up to 365 days back
    for (let i = 0; i < 365; i++) {
      // Check if all habits are completed for this date
      const allCompleted = habitDefs.length > 0 && habitDefs.every(h => {
        const key = getDateKey(h.id, checkDate);
        return completionsMap[key];
      });

      if (allCompleted) {
        streak++;
      } else {
        // If it's today (i===0) and not complete, we just don't count it yet, 
        // but we check yesterday to keep the streak from previous days.
        // If it's a past day and not complete, streak is broken.
        if (i !== 0) {
          break;
        }
      }

      // Go back one day
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  }, [habitDefs, completionsMap]);

  const totalPossible = currentMonthHabits.length * daysInMonth;
  const globalSuccessRate = totalPossible > 0
    ? Math.round((currentMonthHabits.reduce((acc, h) => acc + h.completions.filter(Boolean).length, 0) / totalPossible) * 100)
    : 0;

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth onLoginSuccess={() => { }} />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // --- Reorder Logic ---
  const handleReorderHabits = (newOrderedSectionHabits: Habit[]) => {
    if (newOrderedSectionHabits.length === 0) return;

    const sectionName = newOrderedSectionHabits[0].section;

    // We want to keep the habits of other sections, and replace the habits of this section 
    // with the new order.

    // Filter out habits from the modified section
    const otherHabits = habitDefs.filter(h => h.section !== sectionName);

    // Combine (Note: This might move the section to the end of the data array, 
    // but the UI typically groups by name so section order assumes discovery order or alphabetical. 
    // Since we use Object.entries, it is often creation order.
    // Ideally we would splice them back in place, but this is complex without known blocks.)

    // To preserve section order better, let's try to reconstruct the array:
    // This is a simplistic approach: Rebuild the whole array based on the `sections` derived state 
    // (which we don't have inside this function easily without recalc). 

    // Simple approach for now:
    setHabitDefs([...otherHabits, ...newOrderedSectionHabits]);
  };



  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden" >
      <Sidebar activePage={activePage} onNavigate={setActivePage} onSignOut={handleSignOut} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activePage === 'dashboard' ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">
              <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Dashboard de Hábitos</h1>
                  <p className="text-zinc-500 text-sm">
                    Acompanhe sua evolução diária em <span className="text-zinc-300 font-medium capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
                  {/* Weekly Visual Calendar */}
                  <div className="hidden md:flex items-center gap-1.5 bg-[#111] p-1.5 rounded-xl border border-zinc-900 shadow-sm">
                    {weekOverview.map((day, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center w-10 h-11 rounded-lg text-xs transition-colors ${day.isToday
                          ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm'
                          : 'text-zinc-600 hover:bg-zinc-900/50'
                          }`}
                      >
                        <span className="leading-none text-[10px] mb-1">{day.dayStr}/{day.monthStr}</span>
                        <span className="uppercase text-[9px] opacity-70 leading-none">{day.weekDay}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-zinc-900">
                      <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-[#2a2a2a] rounded-md transition-colors text-zinc-400 hover:text-white"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-[#2a2a2a] rounded-md transition-colors text-zinc-400 hover:text-white"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">Novo Hábito</span>
                    </button>
                  </div>
                </div>
              </header>

              <StatsCards
                streak={currentStreak}
                todayCompleted={isCurrentMonth ? todayCompletedCount : 0}
                totalHabits={habitDefs.length}
                successRate={globalSuccessRate}
              />

              <HabitChart
                data={chartData}
                currentMonthName={currentDate.toLocaleString('pt-BR', { month: 'long' })}
                average={monthAverage}
              />

              <div className="mb-8">
                <WeeklyKanban
                  tasks={dailyTasks}
                  onAddTask={handleAddDailyTask}
                  onDeleteTask={handleDeleteDailyTask}
                  onToggleTask={handleToggleDailyTask}
                  onMoveTask={handleMoveDailyTask}
                />
              </div>

              <div className="flex flex-col gap-8">
                {Object.entries(sections).map(([sectionTitle, sectionHabits]) => (
                  <HabitGrid
                    key={sectionTitle}
                    habits={sectionHabits}
                    dayLabels={dayLabels}
                    today={currentDayHighlight}
                    onToggle={toggleHabit}
                    onHabitAction={handleHabitClick}
                    onReorder={handleReorderHabits}
                    sectionTitle={sectionTitle}
                  />
                ))}
              </div>

              {/* New Habit Modal */}
              {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                      <h3 className="text-lg font-bold text-white">Criar Novo Hábito</h3>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleCreateHabit} className="p-6">
                      <div className="mb-6">
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
                          Nome do Hábito
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          placeholder="Ex: Correr 5km, Beber Água..."
                          className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-zinc-600 mb-4"
                        />

                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Seção
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsNewSectionMode(!isNewSectionMode)}
                            className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors"
                          >
                            {isNewSectionMode ? 'Selecionar existente' : 'Criar nova seção'}
                          </button>
                        </div>

                        {isNewSectionMode ? (
                          <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Ex: Meta Profissional"
                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all placeholder:text-zinc-600"
                          />
                        ) : (
                          <select
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                          >
                            {Array.from(new Set(habitDefs.map(h => h.section || 'Hábito'))).map(section => (
                              <option key={section} value={section}>{section}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!newHabitName.trim()}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold transition-all hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                        >
                          Criar Hábito
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activePage === 'finance' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">
            <FinanceDashboard
              transactions={transactions}
              goals={financialGoals}
              budgets={budgets} // New
              recurringExpenses={recurringExpenses} // New
              currentDate={financeDate}
              onNavigateMonth={handleNavigateFinanceMonth}
              onAddTransaction={handleAddTransactionManual}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onAddBudget={handleAddBudget}
              onAddRecurring={handleAddRecurring}
              onPayRecurring={handlePayRecurring}
              onEditBudget={handleEditBudget}
              onDeleteRecurring={handleDeleteRecurring}
              onToggleRecurringPay={handleToggleRecurringPay}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        ) : activePage === 'agent' ? (
          <div className="flex-1 p-4 md:p-8 h-full flex flex-col overflow-hidden pb-20 md:pb-8">
            <FinanceAI onAddTransaction={addTransactionFromAI} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-300">
            {activePage === 'calendar' && (
              <div className="text-center">
                <div className="p-4 bg-zinc-900 rounded-full mb-4 inline-block">
                  <Calendar size={32} className="text-zinc-600" />
                </div>
                <h2 className="text-xl font-bold text-zinc-300 mb-2">Calendário</h2>
                <p className="opacity-60">Visualização de calendário em desenvolvimento.</p>
              </div>
            )}
            {activePage === 'profile' && (
              <div className="w-full max-w-sm mx-auto">
                <div className="bg-[#111] border border-zinc-800 rounded-2xl p-8 text-center shadow-lg">
                  <div className="w-20 h-20 bg-zinc-800 rounded-full mx-auto mb-4 flex items-center justify-center text-zinc-500">
                    <User size={40} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">Minha Conta</h2>
                  <p className="text-zinc-400 text-sm mb-8">{session?.user?.email}</p>

                  <div className="flex flex-col gap-3">
                    <button className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-3 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2">
                      <Edit2 size={16} />
                      Editar Perfil
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-3 rounded-lg font-medium transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} /> {/* Using Trash as logout icon substitute for variety, or keep LogOut */}
                      Sair da Conta
                    </button>
                  </div>

                  <div className="mt-8 pt-8 border-t border-zinc-900">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Estatísticas Gerais</p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-zinc-900/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-white">{habitDefs.length}</div>
                        <div className="text-xs text-zinc-500">Hábitos Ativos</div>
                      </div>
                      <div className="bg-zinc-900/50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-500">{globalSuccessRate}%</div>
                        <div className="text-xs text-zinc-500">Taxa de Sucesso</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Habit Options Modal */}
        {habitAction === 'options' && activeHabit && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${activeHabit.color} border border-zinc-800/50`}>
                    {activeHabit.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white truncate max-w-[180px]">{activeHabit.name}</h3>
                </div>
                <button onClick={closeHabitModal} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-2">
                <button
                  onClick={startRename}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#1a1a1a] rounded-xl text-zinc-300 hover:text-white transition-all group"
                >
                  <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-zinc-800 transition-colors">
                    <Edit2 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-medium">Renomear Hábito</span>
                    <span className="text-xs text-zinc-500">Alterar o nome de exibição</span>
                  </div>
                </button>
                <div className="h-px bg-zinc-900 mx-4 my-1" />
                <button
                  onClick={startDelete}
                  className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 rounded-xl text-zinc-300 hover:text-red-500 transition-all group"
                >
                  <div className="p-2 bg-zinc-900 rounded-lg group-hover:bg-red-500/20 transition-colors text-zinc-500 group-hover:text-red-500">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-medium">Excluir Hábito</span>
                    <span className="text-xs text-zinc-500">Esta ação não pode ser desfeita</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {habitAction === 'rename' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-zinc-900">
                <h3 className="text-lg font-bold text-white">Renomear Hábito</h3>
                <button onClick={closeHabitModal} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={confirmRename} className="p-6">
                <div className="mb-6">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Novo Nome</label>
                  <input
                    type="text"
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setHabitAction('options')} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Voltar</button>
                  <button type="submit" disabled={!renameText.trim()} className="bg-white text-black hover:bg-zinc-200 px-6 py-2 rounded-lg text-sm font-bold transition-all">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {habitAction === 'delete' && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111111] border border-red-900/30 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Tem certeza?</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  Para confirmar a exclusão do hábito <span className="text-white font-medium">"{activeHabit?.name}"</span>, digite <span className="text-red-500 font-bold uppercase">excluir</span> abaixo.
                </p>
                <form onSubmit={confirmDelete}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite 'excluir'"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-center placeholder:text-zinc-700"
                  />
                  <div className="flex justify-center gap-3">
                    <button type="button" onClick={() => setHabitAction('options')} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                    <button
                      type="submit"
                      disabled={deleteConfirmText.toLowerCase() !== 'excluir'}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                    >
                      Excluir Hábito
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <MobileNavigation activePage={activePage} onNavigate={setActivePage} />
    </div >
  );
};

export default App;