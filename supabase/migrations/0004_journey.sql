create table if not exists public.journey_template_steps (
  id uuid primary key default gen_random_uuid(),
  step_no integer not null unique,
  title text not null,
  subtitle text,
  description text,
  status text not null default 'pending',
  progress_percent numeric not null default 0,
  target_date date,
  completed_date date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journey_template_steps_step_no_range check (step_no between 1 and 8),
  constraint journey_template_steps_progress_range check (progress_percent between 0 and 100)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'journey_template_steps_set_updated_at'
  ) then
    create trigger journey_template_steps_set_updated_at
    before update on public.journey_template_steps
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

insert into public.journey_template_steps (
  step_no,
  title,
  subtitle,
  status,
  progress_percent,
  target_date,
  completed_date,
  description
)
values
  (1, '계약 및 예약 확인', 'Contract confirmation', 'completed', 100, '2026-07-01', '2026-07-01', '계약 및 예약 정보 확인이 완료된 단계입니다.'),
  (2, '설계 및 인허가 준비', 'Design and permits', 'in_progress', 45, '2026-08-30', null, '설계 검토와 인허가 준비를 진행하는 단계입니다.'),
  (3, '기초공사', 'Foundation works', 'pending', 0, '2026-10-20', null, '현장 기초공사 착수와 완료 현황을 안내합니다.'),
  (4, '골조공사', 'Structural frame', 'pending', 0, '2026-12-20', null, '건물 골조공사의 주요 진행 상황을 안내합니다.'),
  (5, '벽체 및 외장공사', 'Walls and exterior', 'pending', 0, '2027-02-20', null, '벽체 시공과 외장 공정 진행 상황을 안내합니다.'),
  (6, '지붕 / 천장 / 전기공사', 'Roof, ceiling and electrical', 'pending', 0, '2027-04-20', null, '지붕, 천장, 전기 설비 공정 진행 상황을 안내합니다.'),
  (7, '내부 마감 및 점검', 'Interior finishing and inspection', 'pending', 0, '2027-06-20', null, '내부 마감과 품질 점검 진행 상황을 안내합니다.'),
  (8, '입주 준비 완료', 'Move-in preparation', 'pending', 0, '2027-08-31', null, '입주 전 최종 준비와 안내가 제공되는 단계입니다.')
on conflict (step_no) do nothing;

alter table public.journey_template_steps enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'journey_template_steps'
      and policyname = 'journey_template_steps_admin_all'
  ) then
    create policy "journey_template_steps_admin_all"
    on public.journey_template_steps
    for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'journey_template_steps'
      and policyname = 'journey_template_steps_contractor_select'
  ) then
    create policy "journey_template_steps_contractor_select"
    on public.journey_template_steps
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'contractor'
      )
    );
  end if;
end $$;
