alter table public.clients
  add column if not exists page_count integer not null default 1,
  add column if not exists delivered_at date;

alter table public.clients
  drop constraint if exists clients_page_count_check;

alter table public.clients
  add constraint clients_page_count_check check (page_count > 0);