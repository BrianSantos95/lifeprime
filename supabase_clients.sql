create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  contact text,
  project text,
  amount numeric not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'half', 'paid')),
  project_status text not null default 'lead' check (project_status in ('lead', 'proposal', 'development', 'review', 'delivered')),
  follow_up_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table clients enable row level security;
create policy "Users can view own clients" on clients for select using (auth.uid() = user_id);
create policy "Users can create own clients" on clients for insert with check (auth.uid() = user_id);
create policy "Users can update own clients" on clients for update using (auth.uid() = user_id);
create policy "Users can delete own clients" on clients for delete using (auth.uid() = user_id);
