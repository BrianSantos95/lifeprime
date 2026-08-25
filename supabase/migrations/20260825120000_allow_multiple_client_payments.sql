-- Permite registrar entrada e saldo do mesmo cliente em datas diferentes.
drop index if exists public.transactions_client_id_unique;
create index if not exists transactions_client_id_idx
  on public.transactions(client_id) where client_id is not null;
