create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text,
  description text,
  status text not null default 'active',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_status_check check (status in ('active', 'planning', 'paused', 'archived'))
);

create index projects_status_idx on public.projects (status);
create index projects_default_idx on public.projects (is_default);

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy projects_admin_select
on public.projects
for select to authenticated
using (public.is_admin());

create policy projects_admin_insert
on public.projects
for insert to authenticated
with check (public.is_admin());

create policy projects_admin_update
on public.projects
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy projects_admin_delete
on public.projects
for delete to authenticated
using (public.is_admin());

insert into public.projects (name, slug, location, description, status, is_default)
values (
  'Timor Crest',
  'timor-crest',
  'Dili, Timor-Leste',
  'Timor Crest primary development project',
  'active',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  location = excluded.location,
  description = excluded.description,
  status = excluded.status,
  is_default = excluded.is_default;
