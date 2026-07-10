create table public.units (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null unique,
  unit_name text,
  property_type text,
  total_price numeric,
  currency text not null default 'USD',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  passport_no text,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger units_set_updated_at
before update on public.units
for each row
execute function public.set_updated_at();

create trigger contractors_set_updated_at
before update on public.contractors
for each row
execute function public.set_updated_at();

create index units_unit_code_idx on public.units (unit_code);
create index contractors_profile_id_idx on public.contractors (profile_id);
create index contractors_unit_id_idx on public.contractors (unit_id);

alter table public.units enable row level security;
alter table public.contractors enable row level security;

create policy "units_admin_all"
on public.units
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "units_contractor_select_own"
on public.units
for select
to authenticated
using (
  exists (
    select 1
    from public.contractors
    where contractors.unit_id = units.id
      and contractors.profile_id = auth.uid()
  )
);

create policy "contractors_admin_all"
on public.contractors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "contractors_select_own"
on public.contractors
for select
to authenticated
using (profile_id = auth.uid());
