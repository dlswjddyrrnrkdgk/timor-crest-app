create table public.accounting_transactions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  transaction_date date not null,
  direction text not null,
  account_category text not null,
  tax_category text not null default 'not_reviewed',
  counterparty_name text,
  description text not null,
  payment_method text not null default 'bank_transfer',
  amount numeric(14, 2) not null default 0,
  reference_no text,
  related_unit_id uuid references public.units(id) on delete set null,
  related_contractor_id uuid references public.contractors(id) on delete set null,
  source_type text not null default 'manual',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_transactions_direction_check
    check (direction in ('income', 'expense')),
  constraint accounting_transactions_amount_check
    check (amount >= 0),
  constraint accounting_transactions_payment_method_check
    check (payment_method in ('cash', 'bank_transfer', 'card', 'cheque', 'other')),
  constraint accounting_transactions_source_type_check
    check (source_type in ('manual', 'payment_reference', 'refund', 'adjustment', 'opening_balance', 'other')),
  constraint accounting_transactions_tax_category_check
    check (tax_category in (
      'not_reviewed',
      'income_tax_reference',
      'withholding_tax_review',
      'service_tax_review',
      'wages_tax_review',
      'exempt_or_out_of_scope',
      'other'
    ))
);

create index accounting_transactions_project_id_idx
  on public.accounting_transactions(project_id);
create index accounting_transactions_transaction_date_idx
  on public.accounting_transactions(transaction_date);
create index accounting_transactions_direction_idx
  on public.accounting_transactions(direction);
create index accounting_transactions_project_date_idx
  on public.accounting_transactions(project_id, transaction_date desc);
create index accounting_transactions_related_unit_id_idx
  on public.accounting_transactions(related_unit_id);
create index accounting_transactions_related_contractor_id_idx
  on public.accounting_transactions(related_contractor_id);

create trigger accounting_transactions_set_updated_at
before update on public.accounting_transactions
for each row
execute function public.set_updated_at();

alter table public.accounting_transactions enable row level security;

create policy accounting_transactions_admin_select
on public.accounting_transactions
for select to authenticated
using (public.is_admin());

create policy accounting_transactions_admin_insert
on public.accounting_transactions
for insert to authenticated
with check (public.is_admin());

create policy accounting_transactions_admin_update
on public.accounting_transactions
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy accounting_transactions_admin_delete
on public.accounting_transactions
for delete to authenticated
using (public.is_admin());
