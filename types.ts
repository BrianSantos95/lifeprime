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
  percentage: number | null;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: Date;
  clientId?: string;
  campaignId?: string;
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
  installmentsTotal?: number; // Total number of installments (e.g., 12)
  currentInstallment?: number; // Current installment number (e.g., 1, 2, 3...)
}

export interface DailyTask {
  id: string;
  day: string; // 'Segunda', 'Terça', ...
  text: string;
  completed: boolean;
  position: number;
}

export type ClientPaymentStatus = 'pending' | 'half' | 'paid';
export type ClientPaymentMethod = 'pix' | 'card';
export type ClientProjectStatus = 'awaiting_info' | 'started' | 'review' | 'delivered';
export type AcquisitionSource =
  | 'not_informed'
  | 'paid_traffic'
  | 'active_prospecting'
  | 'organic'
  | 'referral'
  | 'partnership'
  | 'other';

export type TrafficCampaignPlatform =
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_ads'
  | 'linkedin_ads'
  | 'other';

export type TrafficCampaignStatus = 'active' | 'paused' | 'completed';

export interface TrafficCampaign {
  id: string;
  name: string;
  platform: TrafficCampaignPlatform;
  status: TrafficCampaignStatus;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  contact?: string;
  project?: string;
  amount: number;
  currency: 'BRL' | 'USD' | 'EUR';
  paymentStatus: ClientPaymentStatus;
  paymentMethod: ClientPaymentMethod;
  paidAmount: number;
  paymentDate?: string;
  projectStatus: ClientProjectStatus;
  pageCount: number;
  startedAt?: string;
  deliveredAt?: string;
  acquisitionSource: AcquisitionSource;
  closedAfterFollowUp?: boolean;
  trafficCampaignId?: string;
  acquiredAt?: string;
  acquisitionDetail?: string;
  notes?: string;
  createdAt?: string;
}
