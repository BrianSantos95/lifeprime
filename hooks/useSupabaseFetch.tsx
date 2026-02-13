
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Habit, Transaction, FinancialGoal, Budget, RecurringExpense, DailyTask } from '../types';
import { Droplets, Book, Activity, Moon, Coffee, Zap, Music, Briefcase } from 'lucide-react';

const iconMap: Record<string, any> = {
    'Droplets': <Droplets size={16} />,
    'Book': <Book size={16} />,
    'Activity': <Activity size={16} />,
    'Moon': <Moon size={16} />,
    'Coffee': <Coffee size={16} />,
    'Zap': <Zap size={16} />,
    'Music': <Music size={16} />,
    'Briefcase': <Briefcase size={16} />
};

export const useSupabaseData = (session: any) => {
    console.log("useSupabaseData HOOK CALLED. Session:", session);
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
                const { data: habitsData } = await supabase.from('habits').select('*');
                if (habitsData) {
                    const formattedHabits = habitsData.map((h: any) => ({
                        id: h.id,
                        name: h.name,
                        color: h.color || 'text-white',
                        section: h.section || 'Hábito',
                        icon: iconMap[h.icon] || <Activity size={16} />,
                        completions: []
                    }));
                    setHabits(formattedHabits);
                }

                // 2. Completions
                const { data: compData } = await supabase.from('habit_completions').select('*');
                if (compData) {
                    const map: Record<string, boolean> = {};
                    compData.forEach((c: any) => {
                        const date = new Date(c.completed_date);
                        // Assuming the date string from DB is YYYY-MM-DD
                        // Using standard JS date parsing might introduce timezone offsets
                        // Ideally we parse parts manually or use UTC methods if stored as UTC
                        // For now, trusting standard Date constructor but using consistent key gen
                        const key = `${c.habit_id}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                        map[key] = true;
                    });
                    setCompletions(map);
                }

                // 3. Transactions
                const { data: transData } = await supabase.from('transactions').select('*');
                if (transData) {
                    const formatted = transData.map((t: any) => ({
                        ...t,
                        date: new Date(t.date)
                    }));
                    setTransactions(formatted);
                }

                // 4. Goals
                const { data: goalsData } = await supabase.from('financial_goals').select('*');
                if (goalsData) setGoals(goalsData);

                // 5. Budgets
                const { data: budgetsData } = await supabase.from('budgets').select('*');
                if (budgetsData) setBudgets(budgetsData);

                // 6. Recurring
                const { data: recData } = await supabase.from('recurring_expenses').select('*');
                if (recData) {
                    const formatted = recData.map((r: any) => ({
                        ...r,
                        lastPaidDate: r.last_paid_date ? new Date(r.last_paid_date) : undefined
                    }));
                    setRecurring(formatted);
                }

                // 7. Tasks
                const { data: tasksData } = await supabase.from('daily_tasks').select('*');
                if (tasksData) setTasks(tasksData);

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
