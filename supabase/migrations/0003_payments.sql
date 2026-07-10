create table public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  total_price numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_plans_contractor_id_key unique (contractor_id)
);

create table public.payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.payment_plans(id) on delete cascade,
  step_no integer not null,
  title text not null,
  required_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  due_date date,
  paid_date date,
  status text not null default 'unpaid',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_items_step_no_range check (step_no between 1 and 8),
  constraint payment_items_plan_step_key unique (payment_plan_id, step_no)
);

create trigger payment_plans_set_updated_at
before update on public.payment_plans
for each row
execute function public.set_updated_at();

create trigger payment_items_set_updated_at
before update on public.payment_items
for each row
execute function public.set_updated_at();

create index payment_plans_contractor_id_idx on public.payment_plans (contractor_id);
create index payment_plans_unit_id_idx on public.payment_plans (unit_id);
create index payment_items_payment_plan_id_idx on public.payment_items (payment_plan_id);

alter table public.payment_plans enable row level security;
alter table public.payment_items enable row level security;

create policy "payment_plans_admin_all"
on public.payment_plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payment_plans_contractor_select_own"
on public.payment_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.contractors
    where contractors.id = payment_plans.contractor_id
      and contractors.profile_id = auth.uid()
  )
);

create policy "payment_items_admin_all"
on public.payment_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "payment_items_contractor_select_own"
on public.payment_items
for select
to authenticated
using (
  exists (
    select 1
    from public.payment_plans
    join public.contractors on contractors.id = payment_plans.contractor_id
    where payment_plans.id = payment_items.payment_plan_id
      and contractors.profile_id = auth.uid()
  )
);
