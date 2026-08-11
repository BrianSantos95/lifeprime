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
import WeeklyKanban from './components/WeeklyKanban';
import ClientsDashboard from './components/ClientsDashboard';
import { Habit, ChartDataPoint, Transaction, FinancialGoal, Budget, RecurringExpense, DailyTask, Client } from './types';

// Helper to format date keys for storage
const getDateKey = (habitId: number, date: Date) => {
  return `${habitId}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// ... imports
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import { parseCurrencyInput } from './lib/currency';

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
    tasks: dailyTasks, setTasks: setDailyTasks,
    clients, setClients
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
      const taskPosition = dailyTasks.filter(task => task.day === day).length;
      let { data, error } = await supabase.from('daily_tasks').insert({
        user_id: session.user.id,
        day,
        text,
        completed: false,
        position: taskPosition
      }).select().single();

      if (error?.code === '42703' || error?.message?.includes('position')) {
        const fallback = await supabase.from('daily_tasks').insert({
          user_id: session.user.id,
          day,
          text,
          completed: false
        }).select().single();
        data = fallback.data ? { ...fallback.data, position: taskPosition } : null;
        error = fallback.error;
      }

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

  const handleMoveDailyTask = async (taskId: string, newDay: string, newIndex: number) => {
    const previousTasks = dailyTasks;
    const activeTask = previousTasks.find(task => task.id === taskId);
    if (!activeTask) return;

    const remainingTasks = previousTasks.filter(task => task.id !== taskId);
    const targetTasks = remainingTasks.filter(task => task.day === newDay);
    targetTasks.splice(Math.max(0, Math.min(newIndex, targetTasks.length)), 0, { ...activeTask, day: newDay });

    const affectedDays = new Set([activeTask.day, newDay]);
    const updatedTasks = previousTasks
      .filter(task => !affectedDays.has(task.day) && task.id !== taskId)
      .concat(
        [...affectedDays].flatMap(day => {
          const dayTasks = day === newDay
            ? targetTasks
            : remainingTasks.filter(task => task.day === day);
          return dayTasks.map((task, position) => ({ ...task, position }));
        })
      );

    setDailyTasks(updatedTasks);

    try {
      const changedTasks = updatedTasks.filter(task => affectedDays.has(task.day));
      const results = await Promise.all(changedTasks.map(task =>
        supabase.from('daily_tasks').update({ day: task.day, position: task.position }).eq('id', task.id)
      ));
      const failedResult = results.find(result => result.error);
      if (failedResult?.error?.code === '42703' || failedResult?.error?.message?.includes('position')) {
        const { error: dayUpdateError } = await supabase
          .from('daily_tasks')
          .update({ day: newDay })
          .eq('id', taskId);
        if (dayUpdateError) throw dayUpdateError;

        const localOrder = Object.fromEntries(updatedTasks.map(task => [
          task.id,
          { day: task.day, position: task.position }
        ]));
        localStorage.setItem(`habitpulse-task-order-${session.user.id}`, JSON.stringify(localOrder));
        return;
      }
      if (failedResult?.error) throw failedResult.error;
    } catch (err) {
      console.error('Error moving task:', err);
      setDailyTasks(previousTasks);
      alert('Não foi possível mover a tarefa. Tente novamente.');
    }
  };

  const handleEditDailyTask = async (taskId: string, text: string) => {
    const previousTasks = dailyTasks;
    setDailyTasks(prev => prev.map(task => task.id === taskId ? { ...task, text } : task));
    const { error } = await supabase.from('daily_tasks').update({ text }).eq('id', taskId);
    if (error) {
      console.error('Error editing task:', error);
      setDailyTasks(previousTasks);
      alert('Não foi possível editar a tarefa.');
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
    const amountMatch = text.match(/(?:R\$|BRL)?\s?(\d[\d.,]*)/i);
    if (amountMatch && amountMatch[1]) {
      amount = parseCurrencyInput(amountMatch[1]);
    } else {
      return null;
    }

    // 3. Extract Category/Description (Simplified for brevity)
    let cleanText = lowerText.replace(/(?:R\$|BRL)?\s?(\d[\d.,]*)/i, '').replace(/[.,!?;:]/g, ' ');
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
    const tempId = 'goal-' + Date.now();
    const newGoal: FinancialGoal = {
      id: tempId,
      name: data.name,
      targetAmount: Number(data.targetAmount) || 0,
      currentAmount: 0,
      deadline: data.deadline ? (data.deadline instanceof Date ? data.deadline : new Date(data.deadline)) : undefined,
      icon: typeof data.icon === 'string' ? data.icon : 'Star',
      color: data.color
    };

    // Atualização Otimista imediata na tela
    setFinancialGoals(prev => [...prev, newGoal]);

    if (!session?.user?.id) return;
    try {
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

      if (error) {
        console.error('Erro no Supabase ao salvar meta:', error);
      } else if (goalData) {
        setFinancialGoals(prev => prev.map(g => g.id === tempId ? {
          id: goalData.id,
          name: goalData.name,
          targetAmount: Number(goalData.target_amount),
          currentAmount: Number(goalData.current_amount),
          deadline: goalData.deadline ? new Date(goalData.deadline) : undefined,
          icon: goalData.icon || 'Star',
          color: goalData.color
        } : g));
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
    const tempId = 'budget-' + Date.now();
    const newBudget: Budget = {
      id: tempId,
      category: budget.category,
      limit: Number(budget.limit) || 0
    };

    // Atualização Otimista imediata na tela
    setBudgets(prev => [...prev, newBudget]);

    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase.from('budgets').insert({
        user_id: session.user.id,
        category: budget.category,
        limit: budget.limit
      }).select().single();

      if (error) {
        console.error('Erro no Supabase ao salvar meta de gasto:', error);
      } else if (data) {
        setBudgets(prev => prev.map(b => b.id === tempId ? { ...b, id: data.id } : b));
      }
    } catch (err) { console.error('Error adding budget:', err); }
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

  const handleEditRecurring = async (
    id: string,
    rec: Omit<RecurringExpense, 'id' | 'lastPaidDate'>
  ) => {
    const previousExpenses = recurringExpenses;
    setRecurringExpenses(prev => prev.map(expense => expense.id === id ? { ...expense, ...rec } : expense));

    const { error } = await supabase.from('recurring_expenses').update({
      description: rec.description,
      category: rec.category,
      type: rec.type,
      amount: rec.amount ?? null,
      due_day: rec.dayOfMonth,
      installments_total: rec.installmentsTotal ?? null,
      current_installment: rec.currentInstallment ?? null
    }).eq('id', id);

    if (error) {
      console.error('Error editing recurring expense:', error);
      setRecurringExpenses(previousExpenses);
      alert('Não foi possível editar a despesa.');
    }
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
  const clientPayload = (client: Omit<Client, 'id' | 'createdAt'>) => ({
    user_id: session.user.id,
    name: client.name,
    contact: client.contact || null,
    project: client.project || null,
    amount: client.amount,
    currency: client.currency,
    payment_status: client.paymentStatus,
    project_status: client.projectStatus,
    follow_up_date: client.followUpDate || null,
    notes: client.notes || null
  });

  const handleAddClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase.from('clients').insert(clientPayload(client)).select().single();
    if (error) { console.error(error); alert('Nao foi possivel salvar. Execute a migracao supabase_clients.sql.'); return false; }
    setClients((current: Client[]) => [{ ...client, id: data.id, createdAt: data.created_at }, ...current]);
    return true;
  };

  const handleEditClient = async (id: string, client: Omit<Client, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('clients').update(clientPayload(client)).eq('id', id);
    if (error) { console.error(error); alert('Nao foi possivel atualizar o cliente.'); return false; }
    setClients((current: Client[]) => current.map(item => item.id === id ? { ...item, ...client } : item));
    return true;
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { console.error(error); alert('Nao foi possivel excluir o cliente.'); return; }
    setClients((current: Client[]) => current.filter(item => item.id !== id));
  };

  return (
    <div className="app-shell flex h-screen text-slate-300 font-sans overflow-hidden" >
      <Sidebar activePage={activePage} onNavigate={setActivePage} onSignOut={handleSignOut} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activePage === 'dashboard' ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-7 xl:p-8 pb-24 md:pb-8">
              <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-7 gap-5">
                <div>
                  <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.025em] text-white mb-1">Dashboard de Hábitos</h1>
                  <p className="text-slate-400 text-sm">
                    Acompanhe sua evolução diária em <span className="text-white font-semibold capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
                  {/* Weekly Visual Calendar */}
                  <div className="hidden md:flex items-center gap-1 bg-[#0c111e]/80 p-1.5 rounded-2xl border border-white/[0.08] backdrop-blur-md">
                    {weekOverview.map((day, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col items-center justify-center w-10 h-11 rounded-xl text-xs transition-all ${day.isToday
                          ? 'bg-blue-600/30 text-white font-bold border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                          : 'text-slate-400 hover:bg-white/[0.05]'
                          }`}
                      >
                        <span className="leading-none text-[10px] mb-1">{day.dayStr}/{day.monthStr}</span>
                        <span className="uppercase text-[9px] font-bold opacity-70 leading-none">{day.weekDay}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex bg-[#0c111e]/80 rounded-2xl p-1 border border-white/[0.08]">
                      <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white/[0.08] rounded-xl transition-colors text-slate-400 hover:text-white"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white/[0.08] rounded-xl transition-colors text-slate-400 hover:text-white"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="btn-glow-primary text-white h-11 px-5 rounded-2xl flex items-center gap-2 text-sm font-semibold transition-all"
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

              <div className="mb-6">
                <WeeklyKanban
                  tasks={dailyTasks}
                  onAddTask={handleAddDailyTask}
                  onDeleteTask={handleDeleteDailyTask}
                  onToggleTask={handleToggleDailyTask}
                  onMoveTask={handleMoveDailyTask}
                  onEditTask={handleEditDailyTask}
                />
              </div>

              <div className="flex flex-col gap-5">
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="bg-[#0e1424]/90 border border-white/10 rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="flex justify-between items-center p-6 border-b border-white/[0.08]">
                      <h3 className="text-lg font-bold text-white">Criar Novo Hábito</h3>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-white/[0.06] rounded-xl"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleCreateHabit} className="p-6">
                      <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Nome do Hábito
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={newHabitName}
                          onChange={(e) => setNewHabitName(e.target.value)}
                          placeholder="Ex: Correr 5km, Beber Água..."
                          className="w-full bg-[#121828]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 mb-4 text-sm"
                        />

                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Seção
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsNewSectionMode(!isNewSectionMode)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
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
                            className="w-full bg-[#121828]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 text-sm"
                          />
                        ) : (
                          <select
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            className="w-full bg-[#121828]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                          >
                            {Array.from(new Set(habitDefs.map(h => h.section || 'Hábito'))).map(section => (
                              <option key={section} value={section} className="bg-[#0e1424] text-white">{section}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={!newHabitName.trim()}
                          className="btn-glow-primary text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-7 xl:p-8 pb-24 md:pb-8">
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
              onEditRecurring={handleEditRecurring}
              onPayRecurring={handlePayRecurring}
              onEditBudget={handleEditBudget}
              onDeleteRecurring={handleDeleteRecurring}
              onToggleRecurringPay={handleToggleRecurringPay}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 animate-in fade-in duration-300">
            {activePage === 'calendar' && <ClientsDashboard clients={clients} onAdd={handleAddClient} onEdit={handleEditClient} onDelete={handleDeleteClient} />}
            {activePage === 'calendar-disabled' && (
              <div className="text-center">
                <div className="p-4 bg-[#101728]/80 border border-white/[0.08] rounded-3xl mb-4 inline-block shadow-lg">
                  <Calendar size={36} className="text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Calendário</h2>
                <p className="opacity-60 text-sm">Visualização detalhada de calendário em desenvolvimento.</p>
              </div>
            )}
            {activePage === 'profile' && (
              <div className="w-full max-w-sm mx-auto">
                <div className="dashboard-card p-8 text-center shadow-2xl">
                  <div className="w-20 h-20 bg-gradient-to-tr from-blue-600/30 to-indigo-600/30 border border-blue-500/40 rounded-full mx-auto mb-4 flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    <User size={40} />
                  </div>
                  <h2 className="text-xl font-extrabold text-white mb-1">Minha Conta</h2>
                  <p className="text-slate-400 text-sm mb-8">{session?.user?.email}</p>

                  <div className="flex flex-col gap-3">
                    <button className="w-full bg-[#121828]/80 hover:bg-white/[0.06] border border-white/[0.08] text-slate-200 py-3 rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-2">
                      <Edit2 size={16} />
                      Editar Perfil
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-3 rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-2"
                    >
                      <Trash2 size={16} />
                      Sair da Conta
                    </button>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/[0.08]">
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Estatísticas Gerais</p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-[#121828]/80 p-3 rounded-2xl border border-white/[0.06]">
                        <div className="text-2xl font-bold text-white">{habitDefs.length}</div>
                        <div className="text-xs text-slate-400">Hábitos Ativos</div>
                      </div>
                      <div className="bg-[#121828]/80 p-3 rounded-2xl border border-white/[0.06]">
                        <div className="text-2xl font-bold text-emerald-400">{globalSuccessRate}%</div>
                        <div className="text-xs text-slate-400">Taxa de Sucesso</div>
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0e1424]/90 border border-white/10 rounded-3xl w-full max-w-sm shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-2xl bg-blue-500/20 flex items-center justify-center ${activeHabit.color} border border-blue-500/30`}>
                    {activeHabit.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white truncate max-w-[180px]">{activeHabit.name}</h3>
                </div>
                <button onClick={closeHabitModal} className="text-slate-400 hover:text-white transition-colors p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-3">
                <button
                  onClick={startRename}
                  className="w-full flex items-center gap-3.5 p-4 hover:bg-white/[0.05] rounded-2xl text-slate-300 hover:text-white transition-all group"
                >
                  <div className="p-2.5 bg-[#121828] rounded-xl group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                    <Edit2 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-sm">Renomear Hábito</span>
                    <span className="text-xs text-slate-500">Alterar o nome de exibição</span>
                  </div>
                </button>
                <div className="h-px bg-white/[0.06] mx-4 my-1" />
                <button
                  onClick={startDelete}
                  className="w-full flex items-center gap-3.5 p-4 hover:bg-rose-500/10 rounded-2xl text-slate-300 hover:text-rose-400 transition-all group"
                >
                  <div className="p-2.5 bg-[#121828] rounded-xl group-hover:bg-rose-500/20 transition-colors text-slate-500 group-hover:text-rose-400">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block font-semibold text-sm">Excluir Hábito</span>
                    <span className="text-xs text-slate-500">Esta ação não pode ser desfeita</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {habitAction === 'rename' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0e1424]/90 border border-white/10 rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-white/[0.08]">
                <h3 className="text-lg font-bold text-white">Renomear Hábito</h3>
                <button onClick={closeHabitModal} className="text-slate-400 hover:text-white transition-colors p-1">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={confirmRename} className="p-6">
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Novo Nome</label>
                  <input
                    type="text"
                    autoFocus
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    className="w-full bg-[#121828]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setHabitAction('options')} className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Voltar</button>
                  <button type="submit" disabled={!renameText.trim()} className="btn-glow-primary text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50">Salvar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {habitAction === 'delete' && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#0e1424]/90 border border-rose-500/30 rounded-3xl w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                  <Trash2 size={30} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Tem certeza?</h3>
                <p className="text-slate-400 text-sm mb-6">
                  Para confirmar a exclusão do hábito <span className="text-white font-semibold">"{activeHabit?.name}"</span>, digite <span className="text-rose-400 font-bold uppercase">excluir</span> abaixo.
                </p>
                <form onSubmit={confirmDelete}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite 'excluir'"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full bg-[#121828]/80 border border-white/[0.08] text-white rounded-2xl px-4 py-3 mb-6 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-center placeholder:text-slate-600 text-sm"
                  />
                  <div className="flex justify-center gap-3">
                    <button type="button" onClick={() => setHabitAction('options')} className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancelar</button>
                    <button
                      type="submit"
                      disabled={deleteConfirmText.toLowerCase() !== 'excluir'}
                      className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)]"
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

