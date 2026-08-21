alter table public.clients
  add column if not exists payment_method text not null default 'pix',
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists payment_date date;

alter table public.clients
  drop constraint if exists clients_payment_method_check;
alter table public.clients
  add constraint clients_payment_method_check check (payment_method in ('pix', 'card'));
alter table public.clients
  drop constraint if exists clients_paid_amount_check;
alter table public.clients
  add constraint clients_paid_amount_check check (paid_amount >= 0 and paid_amount <= amount);

alter table public.transactions
  add column if not exists client_id uuid references public.clients(id) on delete set null;
create unique index if not exists transactions_client_id_unique
  on public.transactions(client_id) where client_id is not null;