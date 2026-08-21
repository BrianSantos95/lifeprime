create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  contact text,
  project text,
  amount numeric not null default 0,
  currency text not null default 'BRL' check (currency in ('BRL', 'USD', 'EUR')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'half', 'paid')),
  payment_method text not null default 'pix' check (payment_method in ('pix', 'card')),
  paid_amount numeric not null default 0,
  payment_date date,
  project_status text not null default 'awaiting_info' check (project_status in ('awaiting_info', 'started', 'review', 'delivered')),
  page_count integer not null default 1 check (page_count > 0),
  delivered_at date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table clients add column if not exists payment_method text not null default 'pix';
alter table clients add column if not exists paid_amount numeric not null default 0;
alter table clients add column if not exists payment_date date;
alter table clients add column if not exists page_count integer not null default 1;
alter table clients add column if not exists started_at date;
alter table clients add column if not exists delivered_at date;
alter table clients enable row level security;
create policy "Users can view own clients" on clients for select using (auth.uid() = user_id);
create policy "Users can create own clients" on clients for insert with check (auth.uid() = user_id);
create policy "Users can update own clients" on clients for update using (auth.uid() = user_id);
create policy "Users can delete own clients" on clients for delete using (auth.uid() = user_id);
