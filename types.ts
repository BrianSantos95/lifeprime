import { ReactNode } from 'react';

export interface Habit {
  id: number;
  name: string;
  icon: ReactNode;
  color: string; // Tailwind text color class, e.g., 'text-blue-400'
  section?: string;
  completions: boolean[];
}

export interface ChartDataPoint {
  day: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  icon?: ReactNode;
  color?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  type: 'fixed' | 'variable';
  amount?: number; // Fixed amount, or estimated for variable
  dayOfMonth: number;
  lastPaidDate?: Date;
}

export interface DailyTask {
  id: string;
  day: string; // 'Segunda', 'Terça', ...
  text: string;
  completed: boolean;
}
