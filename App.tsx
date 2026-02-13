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
  const handleAddDailyTask = (day: string, text: string) => {
    const newTask: DailyTask = {
      id: Date.now().toString(),
      day,
      text,
      completed: false
    };
    setDailyTasks(prev => [...prev, newTask]);
  };

  const handleDeleteDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleToggleDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const handleMoveDailyTask = (taskId: string, newDay: string) => {
    setDailyTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, day: newDay } : t
    ));
  };

  // --- Financial Handlers ---

  const addTransactionFromAI = (text: string): Transaction | null => {
    const lowerText = text.toLowerCase();

    // Improved Stopwords & Keywords
    const stopWords = ['reais', 'real', 'pila', 'pilas', 'conto', 'contos', 'com', 'no', 'na', 'de', 'em', 'para', 'o', 'a', 'os', 'as', 'um', 'uma', 'brl', 'r$'];
    const expenseKeywords = ['gastei', 'paguei', 'compra', 'despesa', 'perdi', 'saída', 'pagamento'];
    const incomeKeywords = ['recebi', 'ganhei', 'venda', 'salário', 'depósito', 'entrada', 'lucro'];

    let type: 'income' | 'expense' = 'expense';
    let amount = 0;
    let category = 'Geral';
    let description = 'Transação Automática';

    // 1. Determine Type
    if (expenseKeywords.some(k => lowerText.includes(k))) {
      type = 'expense';
    } else if (incomeKeywords.some(k => lowerText.includes(k))) {
      type = 'income';
    } else {
      // Default to expense, but check context later if needed
      type = 'expense';
    }

    // 2. Extract Amount
    // Matches "R$ 20", "20,00", "20.00", "20"
    const amountMatch = text.match(/(?:R\$|BRL)?\s?(\d+(?:[.,]\d{1,2})?)/i);
    if (amountMatch && amountMatch[1]) {
      amount = parseFloat(amountMatch[1].replace(',', '.'));
    } else {
      return null;
    }

    // 3. Extract Category/Description
    // Remove keywords, amounts, and common stopwords
    // 3a. Remove the amount we found
    let cleanText = lowerText.replace(/(?:R\$|BRL)?\s?(\d+(?:[.,]\d{1,2})?)/i, '');

    // 3b. Remove punctuation (dots, commas at end of words) so "brl." becomes "brl"
    cleanText = cleanText.replace(/[.,!?;:]/g, ' ');

    let cleanTextParts = cleanText
      .split(' ')
      .map(w => w.trim()) // Trim whitespace
      .filter(word => !stopWords.includes(word) &&
        !expenseKeywords.includes(word) &&
        !incomeKeywords.includes(word) &&
        word.length > 0);

    if (cleanTextParts.length > 0) {
      // Correct capitalization
      const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

      const categoryMap: Record<string, string> = {
        'almoço': 'Alimentação',
        'jantar': 'Alimentação',
        'lanche': 'Alimentação',
        'comida': 'Alimentação',
        'restaurante': 'Alimentação',
        'mercado': 'Alimentação',
        'supermercado': 'Alimentação',
        'uber': 'Transporte',
        '99': 'Transporte',
        'táxi': 'Transporte',
        'ônibus': 'Transporte',
        'combustível': 'Transporte',
        'gasolina': 'Transporte',
        'posto': 'Transporte',
        'cinema': 'Lazer',
        'jogo': 'Lazer',
        'livro': 'Lazer',
        'luz': 'Contas',
        'energia': 'Contas',
        'água': 'Contas',
        'internet': 'Contas',
        'aluguel': 'Moradia',
        'condomínio': 'Moradia',
        'farmácia': 'Saúde',
        'médico': 'Saúde',
        'remédio': 'Saúde'
      };

      const firstWord = cleanTextParts[0];
      // If the word matches a known category or map, use it.
      // If not, and it's substantial, use it as category.
      // Otherwise, default to Geral.

      const mappedCategory = categoryMap[firstWord];
      if (mappedCategory) {
        category = mappedCategory;
      } else {
        // If the word is unknown, we treat it as the category if it looks "valid"
        // EXCEPT if we want to force the user to choose for unknown words.
        // Let's assume Capitalized First Word is the category attempt.
        category = capitalize(firstWord);
      }

      description = cleanTextParts.map(capitalize).join(' ');
    } else {
      // No text left implies "Gastei 20 reais" -> Parts empty -> Type defaults to Expense, Category defaults to Geral.
      category = 'Geral';
      description = type === 'expense' ? 'Despesa Diversa' : 'Receita Diversa';
    }

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type,
      amount,
      category,
      description,
      date: new Date()
    };

    setTransactions(prev => [...prev, newTransaction]);
    return newTransaction;
  };

  const handleUpdateGoal = (goalId: string, amountDelta: number) => {
    setFinancialGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const newAmount = Math.max(0, g.currentAmount + amountDelta);
        return { ...g, currentAmount: newAmount };
      }
      return g;
    }));
  };

  const handleAddTransactionManual = (data: Omit<Transaction, 'id' | 'date'> & { date: Date, goalId?: string, goalContribution?: number }) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      ...data
    };

    setTransactions(prev => [...prev, newTransaction]);

    if (data.goalId && data.type === 'income') {
      const contribution = data.goalContribution !== undefined ? data.goalContribution : data.amount;
      handleUpdateGoal(data.goalId, contribution);
    }
  };

  const handleAddGoal = (data: Omit<FinancialGoal, 'id' | 'currentAmount'>) => {
    const newGoal: FinancialGoal = {
      id: Date.now().toString(),
      currentAmount: 0,
      ...data
    };
    setFinancialGoals(prev => [...prev, newGoal]);
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
      return newDate;
    });
  };

  const handleAddBudget = (budget: Omit<Budget, 'id'>) => {
    const newBudget: Budget = {
      id: Date.now().toString(),
      ...budget
    };
    setBudgets(prev => [...prev, newBudget]);
  };

  const handleAddRecurring = (rec: Omit<RecurringExpense, 'id'>) => {
    const newRec: RecurringExpense = {
      id: Date.now().toString(),
      ...rec,
      lastPaidDate: undefined // Initially not paid
    };
    setRecurringExpenses(prev => [...prev, newRec]);
  };

  const handlePayRecurring = (id: string, amount: number, date: Date) => {
    // 1. Add Transaction
    const expense = recurringExpenses.find(r => r.id === id);
    if (!expense) return;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: 'expense',
      amount: amount,
      category: expense.category,
      description: expense.description + ' (Recorrente)',
      date: date
    };
    setTransactions(prev => [...prev, newTransaction]);

    // 2. Update lastPaidDate
    setRecurringExpenses(prev => prev.map(r =>
      r.id === id ? { ...r, lastPaidDate: date } : r
    ));
  };

  const handleEditBudget = (id: string, newLimit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit: newLimit } : b));
  };

  const handleEditTransaction = (id: string, updatedTransaction: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, ...updatedTransaction } : t
    ));
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleRecurringPay = (id: string, isPaid: boolean, amount?: number, date?: Date) => {
    // If marking as paid (isPaid = true), calling existing logic (simplified)
    if (isPaid && date && amount !== undefined) {
      handlePayRecurring(id, amount, date);
    } else {
      // Marking as UNPAID
      setRecurringExpenses(prev => prev.map(r =>
        r.id === id ? { ...r, lastPaidDate: undefined } : r
      ));
      // NOTE: This does NOT delete the transaction automatically per original requirements discussions, 
      // but effectively resets the dashboard state as requested.
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
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-300 font-sans overflow-hidden">
      <Sidebar activePage={activePage} onNavigate={setActivePage} onSignOut={handleSignOut} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activePage === 'dashboard' ? (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">Dashboard de Hábitos</h1>
                  <p className="text-zinc-500 text-sm">
                    Acompanhe sua evolução diária em <span className="text-zinc-300 font-medium capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                  </p>
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
              </header>

              <StatsCards
                streak={0}
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
    </div>
  );
};

export default App;