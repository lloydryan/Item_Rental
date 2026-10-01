create or replace function public.record_rental_payment(
  p_rental_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_reference_number text default null,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rental_record public.rental_transactions%rowtype;
  rental_total numeric(10, 2);
  amount_paid numeric(10, 2);
  remaining_balance numeric(10, 2);
  payment_id uuid;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'rental') then
    raise exception 'You do not have permission to record payments.';
  end if;

  if p_method not in ('Cash', 'GCash', 'Maya', 'Bank Transfer') then
    raise exception 'Choose Cash, GCash, Maya, or Bank Transfer.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.';
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required.';
  end if;

  if p_method <> 'Cash' and nullif(trim(p_reference_number), '') is null then
    raise exception 'A payment reference number is required for %.', p_method;
  end if;

  select * into rental_record
  from public.rental_transactions
  where id = p_rental_id
  for update;

  if not found then
    raise exception 'Rental transaction was not found.';
  end if;

  rental_total := rental_record.rental_amount + rental_record.delivery_charge + rental_record.additional_charges;

  select coalesce(sum(amount), 0)
  into amount_paid
  from public.payments
  where rental_id = p_rental_id;

  remaining_balance := greatest(0, rental_total - amount_paid);

  if remaining_balance = 0 then
    raise exception 'This rental is already fully paid.';
  end if;

  if p_amount > remaining_balance then
    raise exception 'Payment cannot exceed the remaining balance of %.', remaining_balance;
  end if;

  insert into public.payments (
    rental_id,
    amount,
    payment_date,
    method,
    reference_number,
    notes
  ) values (
    p_rental_id,
    p_amount,
    p_payment_date,
    p_method,
    case when p_method = 'Cash' then null else nullif(trim(p_reference_number), '') end,
    nullif(trim(p_notes), '')
  )
  returning id into payment_id;

  return payment_id;
end;
$$;

revoke all on function public.record_rental_payment(uuid, numeric, date, text, text, text) from public;
grant execute on function public.record_rental_payment(uuid, numeric, date, text, text, text) to authenticated;
