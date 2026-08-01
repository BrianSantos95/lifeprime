-- =====================================================
-- HabitPulse - Schema Completo do Banco de Dados
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- Extensão necessária para uuid_generate_v4()
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. HÁBITOS
-- =====================================================
create table if not exists habits (
  id bigserial primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text default 'Circle',
  color text default 'text-white',
  section text default 'Hábito',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table habits enable row level security;
create policy "Users can view own habits" on habits for select using (auth.uid() = user_id);
create policy "Users can create own habits" on habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on habits for delete using (auth.uid() = user_id);

-- =====================================================
-- 2. COMPLETIONS DE HÁBITOS
-- =====================================================
create table if not exists habit_completions (
  id bigserial primary key,
  habit_id bigint references habits(id) on delete cascade not null,
  user_id uuid references auth.users not null,
  completed_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(habit_id, completed_date)
);
alter table habit_completions enable row level security;
create policy "Users can view own completions" on habit_completions for select using (auth.uid() = user_id);
create policy "Users can create own completions" on habit_completions for insert with check (auth.uid() = user_id);
create policy "Users can delete own completions" on habit_completions for delete using (auth.uid() = user_id);

-- =====================================================
-- 3. TAREFAS DIÁRIAS (Kanban)
-- =====================================================
create table if not exists daily_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  day text not null, -- 'Segunda', 'Terça', etc.
  text text not null,
  completed boolean default false,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table daily_tasks add column if not exists position integer not null default 0;
alter table daily_tasks enable row level security;
create policy "Users can view own tasks" on daily_tasks for select using (auth.uid() = user_id);
create policy "Users can create own tasks" on daily_tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on daily_tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on daily_tasks for delete using (auth.uid() = user_id);

-- =====================================================
-- 4. TRANSAÇÕES FINANCEIRAS
-- =====================================================
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  description text,
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table transactions enable row level security;
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
create policy "Users can create own transactions" on transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on transactions for delete using (auth.uid() = user_id);

-- Índice para melhorar queries de filtro por data
create index if not exists transactions_date_idx on transactions(user_id, date desc);

-- =====================================================
-- 5. METAS FINANCEIRAS
-- =====================================================
create table if not exists financial_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline timestamp with time zone,
  icon text default 'Star',
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table financial_goals enable row level security;
create policy "Users can view own goals" on financial_goals for select using (auth.uid() = user_id);
create policy "Users can create own goals" on financial_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on financial_goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on financial_goals for delete using (auth.uid() = user_id);

-- =====================================================
-- 6. ORÇAMENTOS (Budgets)
-- =====================================================
create table if not exists budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  "limit" numeric not null,
  period text default 'monthly',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table budgets enable row level security;
create policy "Users can view own budgets" on budgets for select using (auth.uid() = user_id);
create policy "Users can create own budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on budgets for delete using (auth.uid() = user_id);

-- =====================================================
-- 7. DESPESAS RECORRENTES
-- =====================================================
create table if not exists recurring_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric,                          -- Nullable para despesas variáveis
  category text,
  type text default 'fixed' check (type in ('fixed', 'variable')),
  due_day integer,                         -- Dia do mês (1-31)
  last_paid_date timestamp with time zone,
  installments_total integer,              -- Total de parcelas (ex: 12)
  current_installment integer default 1,  -- Parcela atual (ex: 1, 2, 3...)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table recurring_expenses enable row level security;
create policy "Users can view own recurring" on recurring_expenses for select using (auth.uid() = user_id);
create policy "Users can create own recurring" on recurring_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring" on recurring_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own recurring" on recurring_expenses for delete using (auth.uid() = user_id);

-- =====================================================
-- MIGRAÇÕES (para banco já existente):
-- Se o banco já foi criado com o setup antigo, rode apenas:
--
-- alter table recurring_expenses
--   add column if not exists type text default 'fixed' check (type in ('fixed', 'variable')),
--   add column if not exists installments_total integer,
--   add column if not exists current_installment integer default 1,
--   alter column amount drop not null;
-- =====================================================
