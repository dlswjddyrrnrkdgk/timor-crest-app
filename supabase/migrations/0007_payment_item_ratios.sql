alter table public.payment_items
add column if not exists payment_ratio numeric(6,2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payment_items_payment_ratio_range'
      and conrelid = 'public.payment_items'::regclass
  ) then
    alter table public.payment_items
    add constraint payment_items_payment_ratio_range
    check (payment_ratio is null or (payment_ratio >= 0 and payment_ratio <= 100));
  end if;
end $$;
