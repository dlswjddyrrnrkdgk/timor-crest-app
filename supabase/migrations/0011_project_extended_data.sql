do $$
declare
  timor_crest_id uuid;
  timor_crest_ocean_id uuid;
begin
  select id into timor_crest_id from public.projects where slug = 'timor-crest';
  select id into timor_crest_ocean_id from public.projects where slug = 'timor-crest-ocean';

  if timor_crest_id is null then
    raise exception 'Timor Crest project is required before applying 0011_project_extended_data';
  end if;

  if timor_crest_ocean_id is null then
    raise exception 'Timor Crest Ocean project is required before applying 0011_project_extended_data';
  end if;
end $$;

alter table public.document_files
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

alter table public.journey_template_steps
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

alter table public.sales_leads
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

alter table public.consultation_notes
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

alter table public.crm_events
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

alter table public.search_performance_snapshots
  add column if not exists project_id uuid references public.projects(id) on delete restrict;

update public.document_files
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.journey_template_steps
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.sales_leads
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.consultation_notes
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.crm_events
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

update public.search_performance_snapshots
set project_id = (select id from public.projects where slug = 'timor-crest')
where project_id is null;

alter table public.journey_template_steps
  drop constraint if exists journey_template_steps_step_no_key;

create unique index if not exists journey_template_steps_project_step_no_key
on public.journey_template_steps(project_id, step_no);

insert into public.journey_template_steps (
  project_id,
  step_no,
  title,
  subtitle,
  description,
  status,
  progress_percent,
  target_date,
  completed_date,
  note,
  created_at,
  updated_at
)
select
  (select id from public.projects where slug = 'timor-crest-ocean'),
  source.step_no,
  source.title,
  source.subtitle,
  source.description,
  'pending',
  0,
  null,
  null,
  null,
  now(),
  now()
from public.journey_template_steps source
where source.project_id = (select id from public.projects where slug = 'timor-crest')
  and not exists (
    select 1
    from public.journey_template_steps existing
    where existing.project_id = (select id from public.projects where slug = 'timor-crest-ocean')
      and existing.step_no = source.step_no
  )
on conflict (project_id, step_no) do nothing;

alter table public.document_files
  alter column project_id set not null;

alter table public.journey_template_steps
  alter column project_id set not null;

alter table public.sales_leads
  alter column project_id set not null;

alter table public.consultation_notes
  alter column project_id set not null;

alter table public.crm_events
  alter column project_id set not null;

alter table public.search_performance_snapshots
  alter column project_id set not null;

create index if not exists document_files_project_id_idx on public.document_files(project_id);
create index if not exists journey_template_steps_project_id_idx on public.journey_template_steps(project_id);
create index if not exists sales_leads_project_id_idx on public.sales_leads(project_id);
create index if not exists consultation_notes_project_id_idx on public.consultation_notes(project_id);
create index if not exists crm_events_project_id_idx on public.crm_events(project_id);
create index if not exists search_performance_snapshots_project_id_idx on public.search_performance_snapshots(project_id);

drop policy if exists journey_template_steps_contractor_select on public.journey_template_steps;

create policy journey_template_steps_contractor_select
on public.journey_template_steps
for select
to authenticated
using (
  exists (
    select 1
    from public.contractors
    where contractors.profile_id = auth.uid()
      and contractors.project_id = journey_template_steps.project_id
  )
);
