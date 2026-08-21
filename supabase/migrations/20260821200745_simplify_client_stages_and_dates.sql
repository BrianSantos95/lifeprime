alter table public.clients
  add column if not exists started_at date;

alter table public.clients
  drop constraint if exists clients_project_status_check;

update public.clients
set project_status = case
  when project_status in ('lead', 'proposal') then 'awaiting_info'
  when project_status = 'development' then 'started'
  else project_status
end;

alter table public.clients
  alter column project_status set default 'awaiting_info';

alter table public.clients
  add constraint clients_project_status_check
  check (project_status in ('awaiting_info', 'started', 'review', 'delivered'));

alter table public.clients
  add constraint clients_delivery_dates_check
  check (delivered_at is null or started_at is null or delivered_at >= started_at);