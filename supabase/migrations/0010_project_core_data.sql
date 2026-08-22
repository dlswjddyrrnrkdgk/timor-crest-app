insert into public.projects (
  name,
  slug,
  location,
  description,
  status,
  is_default,
  created_at,
  updated_at
)
values (
  'Timor Crest Ocean',
  'timor-crest-ocean',
  'Dili, Timor-Leste',
  'Timor Crest Ocean development project',
  'active',
  false,
  now(),
  now()
)
on conflict (slug) do update
set
  name = excluded.name,
  location = excluded.location,
  description = excluded.description,
  status = excluded.status,
  is_default = excluded.is_default,
  updated_at = now();

alter table public.units
  add column project_id uuid references public.projects(id) on delete restrict;

alter table public.contractors
  add column project_id uuid references public.projects(id) on delete restrict;

alter table public.payment_plans
  add column project_id uuid references public.projects(id) on delete restrict;

update public.units
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.contractors
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.payment_plans
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

alter table public.units
  alter column project_id set not null;

alter table public.contractors
  alter column project_id set not null;

alter table public.payment_plans
  alter column project_id set not null;

create index units_project_id_idx on public.units (project_id);
create index contractors_project_id_idx on public.contractors (project_id);
create index payment_plans_project_id_idx on public.payment_plans (project_id);
