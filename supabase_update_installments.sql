-- Run this script in Supabase SQL Editor to add installment support

alter table recurring_expenses 
add column if not exists installments_total integer,
add column if not exists current_installment integer default 1;
