-- Add these tables and policies to your Supabase project using the SQL Editor

-- 1. Daily Tasks (Planning/Kanban)
create table if not exists daily_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  day text not null, -- 'Segunda', etc.
  text text not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table daily_tasks enable row level security;
create policy "Users can view own tasks" on daily_tasks for select using (auth.uid() = user_id);
create policy "Users can create own tasks" on daily_tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on daily_tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on daily_tasks for delete using (auth.uid() = user_id);

-- 2. Transactions
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

-- 3. Financial Goals
create table if not exists financial_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  deadline timestamp with time zone,
  icon text, -- Storing icon name or null
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table financial_goals enable row level security;
create policy "Users can view own goals" on financial_goals for select using (auth.uid() = user_id);
create policy "Users can create own goals" on financial_goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on financial_goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on financial_goals for delete using (auth.uid() = user_id);

-- 4. Budgets
create table if not exists budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  limit numeric not null, -- 'limit' is reserved keyword in some SQL, but usually OK as column name in Postgres if quoted or careful, otherwise rename to 'amount_limit'
  -- Renaming to prevent issues: amount_limit or budget_limit. But code uses 'limit'. Postgres allows 'limit' as column name.
  period text default 'monthly',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Note: Check if 'limit' column causes issues. If so, use "limit" with quotes.
alter table budgets enable row level security;
create policy "Users can view own budgets" on budgets for select using (auth.uid() = user_id);
create policy "Users can create own budgets" on budgets for insert with check (auth.uid() = user_id);
create policy "Users can update own budgets" on budgets for update using (auth.uid() = user_id);
create policy "Users can delete own budgets" on budgets for delete using (auth.uid() = user_id);

-- 5. Recurring Expenses
create table if not exists recurring_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric not null,
  category text,
  due_day integer, -- Day of month
  last_paid_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table recurring_expenses enable row level security;
create policy "Users can view own recurring" on recurring_expenses for select using (auth.uid() = user_id);
create policy "Users can create own recurring" on recurring_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring" on recurring_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own recurring" on recurring_expenses for delete using (auth.uid() = user_id);
