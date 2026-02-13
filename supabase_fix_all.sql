-- RODE ESTE SCRIPT NO SUPABASE PARA CORRIGIR O ERRO

-- 1. Cria as colunas de parcelas (se não existirem)
alter table recurring_expenses 
add column if not exists installments_total integer,
add column if not exists current_installment integer default 1;

-- 2. Permite que o 'Valor' seja vazio (para despesas variáveis)
alter table recurring_expenses 
alter column amount drop not null;
