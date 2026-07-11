create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  category text not null default 'other',
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  file_size bigint,
  status text not null default 'active',
  note text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'document_files_set_updated_at'
  ) then
    create trigger document_files_set_updated_at
    before update on public.document_files
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('timorcrest-documents', 'timorcrest-documents', false)
on conflict (id) do update
set public = false;

alter table public.document_files enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'document_files'
      and policyname = 'document_files_admin_all'
  ) then
    create policy "document_files_admin_all"
    on public.document_files
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
      and tablename = 'document_files'
      and policyname = 'document_files_contractor_select_own'
  ) then
    create policy "document_files_contractor_select_own"
    on public.document_files
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.contractors
        where contractors.id = document_files.contractor_id
          and contractors.profile_id = auth.uid()
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'timorcrest_documents_admin_all'
  ) then
    create policy "timorcrest_documents_admin_all"
    on storage.objects
    for all
    to authenticated
    using (
      bucket_id = 'timorcrest-documents'
      and public.is_admin()
    )
    with check (
      bucket_id = 'timorcrest-documents'
      and public.is_admin()
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'timorcrest_documents_contractor_select_own'
  ) then
    create policy "timorcrest_documents_contractor_select_own"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'timorcrest-documents'
      and exists (
        select 1
        from public.contractors
        where contractors.id::text = split_part(storage.objects.name, '/', 1)
          and contractors.profile_id = auth.uid()
      )
    );
  end if;
end $$;
