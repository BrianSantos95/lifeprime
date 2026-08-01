
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Habit, Transaction, FinancialGoal, Budget, RecurringExpense, DailyTask } from '../types';
import { Circle } from 'lucide-react';

const iconMap: Record<string, any> = {
    'Droplets': <Circle size={12} fill="currentColor" />,
    'Book': <Circle size={12} fill="currentColor" />,
    'Activity': <Circle size={12} fill="currentColor" />,
    'Moon': <Circle size={12} fill="currentColor" />,
    'Coffee': <Circle size={12} fill="currentColor" />,
    'Zap': <Circle size={12} fill="currentColor" />,
    'Music': <Circle size={12} fill="currentColor" />,
    'Briefcase': <Circle size={12} fill="currentColor" />,
    'Circle': <Circle size={12} fill="currentColor" /> // New standard
};

export const useSupabaseData = (session: any) => {
    const [loading, setLoading] = useState(true);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [completions, setCompletions] = useState<Record<string, boolean>>({});
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
    const [tasks, setTasks] = useState<DailyTask[]>([]);

    useEffect(() => {
        if (!session) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Habits
                const { data: habitsData } = await supabase.from('habits').select('*').order('created_at', { ascending: true });
                if (habitsData) {
                    const formattedHabits = habitsData.map((h: any) => ({
                        id: h.id,
                        name: h.name,
                        color: h.color || 'text-white',
                        section: h.section || 'Hábito',
                        icon: iconMap[h.icon] || <Circle size={12} fill="currentColor" />,
                        completions: []
                    }));
                    setHabits(formattedHabits);
                }

                // 2. Completions
                const { data: compData } = await supabase.from('habit_completions').select('*').order('completed_date', { ascending: false });
                if (compData) {
                    const map: Record<string, boolean> = {};
                    compData.forEach((c: any) => {
                        // Support both potential column names and avoid UTC conversion issues by splitting string
                        const dateStr = c.date || c.completed_date;
                        if (!dateStr) return;

                        const [year, month, day] = dateStr.split('-');

                        // JS Date uses 0-indexed months (0=Jan, 1=Feb)
                        // DB uses 1-indexed (01=Jan, 02=Feb)
                        const key = `${c.habit_id}-${parseInt(year)}-${parseInt(month) - 1}-${parseInt(day)}`;
                        map[key] = true;
                    });
                    setCompletions(map);
                }

                // 3. Transactions (ordenadas da mais recente para mais antiga)
                const { data: transData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
                if (transData) {
                    const formatted = transData.map((t: any) => ({
                        ...t,
                        date: new Date(t.date)
                    }));
                    setTransactions(formatted);
                }

                // 4. Goals
                const { data: goalsData } = await supabase.from('financial_goals').select('*').order('created_at', { ascending: true });
                if (goalsData) setGoals(goalsData);

                // 5. Budgets
                const { data: budgetsData } = await supabase.from('budgets').select('*').order('created_at', { ascending: true });
                if (budgetsData) setBudgets(budgetsData);

                // 6. Recurring
                const { data: recData } = await supabase.from('recurring_expenses').select('*').order('due_day', { ascending: true });
                if (recData) {
                    const formatted = recData.map((r: any) => ({
                        ...r,
                        dayOfMonth: r.due_day,
                        lastPaidDate: r.last_paid_date ? new Date(r.last_paid_date) : undefined,
                        installmentsTotal: r.installments_total,
                        currentInstallment: r.current_installment
                    }));
                    setRecurring(formatted);
                }

                // 7. Tasks
                let { data: tasksData, error: tasksError } = await supabase
                    .from('daily_tasks')
                    .select('*')
                    .order('position', { ascending: true })
                    .order('created_at', { ascending: true });

                // Bancos criados antes da ordenação ainda não possuem `position`.
                // Nesse caso, mantém as tarefas visíveis na ordem de criação.
                const isLegacyTaskSchema = tasksError?.code === '42703' || tasksError?.message?.includes('position');
                if (isLegacyTaskSchema) {
                    const fallback = await supabase
                        .from('daily_tasks')
                        .select('*')
                        .order('created_at', { ascending: true });
                    tasksData = fallback.data;
                    tasksError = fallback.error;
                }

                if (tasksError) throw tasksError;
                if (tasksData) {
                    const positionsByDay: Record<string, number> = {};
                    let savedOrder: Record<string, { day: string; position: number }> = {};
                    if (isLegacyTaskSchema) {
                        try {
                            savedOrder = JSON.parse(localStorage.getItem(`habitpulse-task-order-${session.user.id}`) || '{}');
                        } catch {
                            savedOrder = {};
                        }
                    }

                    const formattedTasks = tasksData.map(task => {
                        const fallbackPosition = positionsByDay[task.day] ?? 0;
                        positionsByDay[task.day] = fallbackPosition + 1;
                        return {
                            ...task,
                            day: savedOrder[task.id]?.day ?? task.day,
                            position: savedOrder[task.id]?.position ?? task.position ?? fallbackPosition
                        };
                    });
                    setTasks(formattedTasks.sort((a, b) => a.position - b.position));
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session]);

    return {
        loading,
        habits, setHabits,
        completions, setCompletions,
        transactions, setTransactions,
        goals, setGoals,
        budgets, setBudgets,
        recurring, setRecurring,
        tasks, setTasks
    };
};
