alter table clients
  add column if not exists currency text not null default 'BRL'
  check (currency in ('BRL', 'USD', 'EUR'));
