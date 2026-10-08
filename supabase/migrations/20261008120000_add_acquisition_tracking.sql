create table if not exists public.traffic_campaigns (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  platform text not null default 'meta_ads'
    check (platform in ('meta_ads', 'google_ads', 'tiktok_ads', 'linkedin_ads', 'other')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  monthly_budget numeric not null default 0 check (monthly_budget >= 0),
  start_date date not null default current_date,
  end_date date,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (end_date is null or end_date >= start_date)
);

create unique index if not exists traffic_campaigns_id_user_id_unique
  on public.traffic_campaigns (id, user_id);

alter table public.clients
  add column if not exists acquisition_source text not null default 'not_informed',
  add column if not exists closed_after_follow_up boolean,
  add column if not exists traffic_campaign_id uuid,
  add column if not exists acquired_at date,
  add column if not exists acquisition_detail text;

alter table public.clients
  drop constraint if exists clients_traffic_campaign_id_fkey,
  drop constraint if exists clients_traffic_campaign_owner_fkey;

alter table public.clients
  add constraint clients_traffic_campaign_owner_fkey
  foreign key (traffic_campaign_id, user_id)
  references public.traffic_campaigns (id, user_id)
  on delete restrict;

alter table public.clients
  drop constraint if exists clients_acquisition_source_check;

alter table public.clients
  add constraint clients_acquisition_source_check
  check (acquisition_source in (
    'not_informed',
    'paid_traffic',
    'active_prospecting',
    'organic',
    'referral',
    'partnership',
    'other'
  ));

alter table public.clients
  drop constraint if exists clients_traffic_campaign_source_check;

alter table public.clients
  add constraint clients_traffic_campaign_source_check
  check (traffic_campaign_id is null or acquisition_source = 'paid_traffic');

alter table public.transactions
  add column if not exists campaign_id uuid;

alter table public.transactions
  drop constraint if exists transactions_campaign_id_fkey,
  drop constraint if exists transactions_campaign_owner_fkey;

alter table public.transactions
  add constraint transactions_campaign_owner_fkey
  foreign key (campaign_id, user_id)
  references public.traffic_campaigns (id, user_id)
  on delete restrict;

alter table public.transactions
  drop constraint if exists transactions_campaign_expense_check;

alter table public.transactions
  add constraint transactions_campaign_expense_check
  check (campaign_id is null or type = 'expense');

alter table public.transactions
  drop constraint if exists transactions_campaign_amount_check;

alter table public.transactions
  add constraint transactions_campaign_amount_check
  check (campaign_id is null or amount > 0);

alter table public.traffic_campaigns
  drop constraint if exists traffic_campaigns_completed_end_date_check;

alter table public.traffic_campaigns
  add constraint traffic_campaigns_completed_end_date_check
  check (status <> 'completed' or end_date is not null);

create or replace function public.validate_traffic_campaign_transaction()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  campaign_start date;
  campaign_end date;
begin
  if new.campaign_id is null then
    return new;
  end if;

  select start_date, end_date
    into campaign_start, campaign_end
  from public.traffic_campaigns
  where id = new.campaign_id and user_id = new.user_id;

  if not found then
    raise exception 'Traffic campaign must belong to the transaction owner';
  end if;

  if new.date::date < campaign_start
    or (campaign_end is not null and new.date::date > campaign_end) then
    raise exception 'Traffic investment date must be within the campaign period';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_traffic_campaign_transaction_trigger on public.transactions;
create trigger validate_traffic_campaign_transaction_trigger
  before insert or update of campaign_id, user_id, type, amount, date
  on public.transactions
  for each row
  execute function public.validate_traffic_campaign_transaction();

create or replace function public.validate_traffic_campaign_period_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.transactions item
    where item.campaign_id = new.id
      and (
        item.date::date < new.start_date
        or (new.end_date is not null and item.date::date > new.end_date)
      )
  ) then
    raise exception 'Campaign period cannot exclude existing traffic investments';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_traffic_campaign_period_update_trigger on public.traffic_campaigns;
create trigger validate_traffic_campaign_period_update_trigger
  before update of start_date, end_date
  on public.traffic_campaigns
  for each row
  execute function public.validate_traffic_campaign_period_update();

create index if not exists clients_acquisition_source_idx
  on public.clients (user_id, acquisition_source);

create index if not exists clients_acquired_at_idx
  on public.clients (user_id, acquired_at);

create index if not exists clients_traffic_campaign_idx
  on public.clients (traffic_campaign_id)
  where traffic_campaign_id is not null;

create index if not exists transactions_campaign_date_idx
  on public.transactions (campaign_id, date)
  where campaign_id is not null;

create index if not exists traffic_campaigns_status_idx
  on public.traffic_campaigns (user_id, status);

alter table public.traffic_campaigns enable row level security;

drop policy if exists "Users can view own traffic campaigns" on public.traffic_campaigns;
create policy "Users can view own traffic campaigns"
  on public.traffic_campaigns for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own traffic campaigns" on public.traffic_campaigns;
create policy "Users can create own traffic campaigns"
  on public.traffic_campaigns for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own traffic campaigns" on public.traffic_campaigns;
create policy "Users can update own traffic campaigns"
  on public.traffic_campaigns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own traffic campaigns" on public.traffic_campaigns;
create policy "Users can delete own traffic campaigns"
  on public.traffic_campaigns for delete
  using (auth.uid() = user_id);
