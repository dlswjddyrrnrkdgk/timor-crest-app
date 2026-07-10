create table public.journey_template_steps (
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

create trigger journey_template_steps_set_updated_at
before update on public.journey_template_steps
for each row
execute function public.set_updated_at();

insert into public.journey_template_steps (
  step_no,
  title,
  status,
  progress_percent,
  target_date,
  completed_date,
  description
)
values
  (1, 'BOOKING FEE', 'completed', 100, '2026-07-01', '2026-07-01', 'Booking fee 입금과 계약 접수가 완료되었습니다.'),
  (2, '8주 이내 계약금', 'in_progress', 60, '2026-08-30', null, '계약금 납부 및 공급계약 확인 단계입니다.'),
  (3, '기초공사 완료', 'pending', 0, '2026-10-20', null, '기초공사 완료 시점에 맞춰 안내가 제공됩니다.'),
  (4, '골조 완료', 'pending', 0, '2026-12-20', null, '골조 완료 후 다음 납부 차수가 열립니다.'),
  (5, '벽체 완료', 'pending', 0, '2027-02-20', null, '벽체 완료 일정은 현장 진행에 따라 갱신됩니다.'),
  (6, '지붕 천장 완료', 'pending', 0, '2027-04-20', null, '지붕과 천장 마감 전 점검 안내가 표시됩니다.'),
  (7, '문 / 창호 / 전기 완료', 'pending', 0, '2027-06-20', null, '주요 설비 완료 후 확인 문서가 공개됩니다.'),
  (8, '입주 전', 'pending', 0, '2027-08-31', null, '입주 전 점검과 잔금 안내가 제공됩니다.')
on conflict (step_no) do nothing;

alter table public.journey_template_steps enable row level security;

create policy "journey_template_steps_admin_all"
on public.journey_template_steps
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
