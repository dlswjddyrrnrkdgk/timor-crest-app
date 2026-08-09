create table public.sales_leads (
  id uuid primary key default gen_random_uuid(),
  lead_date date not null default current_date,
  full_name text not null,
  phone text,
  email text,
  source text,
  interested_unit text,
  assigned_to text,
  status text not null default 'new',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultation_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.sales_leads(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  consultation_date timestamptz not null default now(),
  method text,
  consultant text,
  summary text,
  customer_interest text,
  next_action text,
  next_follow_up_date date,
  result text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crm_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.sales_leads(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  title text not null,
  event_type text,
  event_date date not null,
  start_time time,
  end_time time,
  location text,
  assigned_to text,
  memo text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.search_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  report_date date not null default current_date,
  query text,
  page_url text,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr numeric(8,4),
  average_position numeric(8,2),
  source text not null default 'manual',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_leads_lead_date_idx on public.sales_leads (lead_date desc);
create index sales_leads_status_idx on public.sales_leads (status);
create index consultation_notes_consultation_date_idx on public.consultation_notes (consultation_date desc);
create index consultation_notes_lead_id_idx on public.consultation_notes (lead_id);
create index crm_events_event_date_idx on public.crm_events (event_date);
create index crm_events_lead_id_idx on public.crm_events (lead_id);
create index search_performance_snapshots_report_date_idx on public.search_performance_snapshots (report_date desc);
create index search_performance_snapshots_query_idx on public.search_performance_snapshots (query);

create trigger sales_leads_set_updated_at
before update on public.sales_leads
for each row execute function public.set_updated_at();

create trigger consultation_notes_set_updated_at
before update on public.consultation_notes
for each row execute function public.set_updated_at();

create trigger crm_events_set_updated_at
before update on public.crm_events
for each row execute function public.set_updated_at();

create trigger search_performance_snapshots_set_updated_at
before update on public.search_performance_snapshots
for each row execute function public.set_updated_at();

alter table public.sales_leads enable row level security;
alter table public.consultation_notes enable row level security;
alter table public.crm_events enable row level security;
alter table public.search_performance_snapshots enable row level security;

create policy sales_leads_admin_select on public.sales_leads
for select to authenticated using (public.is_admin());
create policy sales_leads_admin_insert on public.sales_leads
for insert to authenticated with check (public.is_admin());
create policy sales_leads_admin_update on public.sales_leads
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sales_leads_admin_delete on public.sales_leads
for delete to authenticated using (public.is_admin());

create policy consultation_notes_admin_select on public.consultation_notes
for select to authenticated using (public.is_admin());
create policy consultation_notes_admin_insert on public.consultation_notes
for insert to authenticated with check (public.is_admin());
create policy consultation_notes_admin_update on public.consultation_notes
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy consultation_notes_admin_delete on public.consultation_notes
for delete to authenticated using (public.is_admin());

create policy crm_events_admin_select on public.crm_events
for select to authenticated using (public.is_admin());
create policy crm_events_admin_insert on public.crm_events
for insert to authenticated with check (public.is_admin());
create policy crm_events_admin_update on public.crm_events
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy crm_events_admin_delete on public.crm_events
for delete to authenticated using (public.is_admin());

create policy search_performance_snapshots_admin_select on public.search_performance_snapshots
for select to authenticated using (public.is_admin());
create policy search_performance_snapshots_admin_insert on public.search_performance_snapshots
for insert to authenticated with check (public.is_admin());
create policy search_performance_snapshots_admin_update on public.search_performance_snapshots
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy search_performance_snapshots_admin_delete on public.search_performance_snapshots
for delete to authenticated using (public.is_admin());
