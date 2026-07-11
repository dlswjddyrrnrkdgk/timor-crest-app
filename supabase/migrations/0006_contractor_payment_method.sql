alter table public.contractors
  add column if not exists payment_method text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists bank_account_holder text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractors_payment_method_check'
      and conrelid = 'public.contractors'::regclass
  ) then
    alter table public.contractors
      add constraint contractors_payment_method_check
      check (
        payment_method is null
        or payment_method in ('cash', 'bank_transfer')
      );
  end if;
end;
$$;
