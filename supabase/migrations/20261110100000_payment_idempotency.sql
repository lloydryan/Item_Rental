alter table public.payments
add column if not exists request_key uuid;

update public.payments
set request_key = gen_random_uuid()
where request_key is null;

alter table public.payments
  alter column request_key set default gen_random_uuid(),
  alter column request_key set not null;

create unique index if not exists payments_request_key_idx
on public.payments(request_key);

drop function if exists public.record_rental_payment(uuid, numeric, date, text, text, text);

create function public.record_rental_payment(
  p_rental_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_request_key uuid,
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
  existing_rental_id uuid;
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

  if p_amount <> round(p_amount, 2) then
    raise exception 'Payment amount cannot have more than two decimal places.';
  end if;

  if p_payment_date is null then
    raise exception 'Payment date is required.';
  end if;

  if p_request_key is null then
    raise exception 'Payment request key is required.';
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

  select id, rental_id into payment_id, existing_rental_id
  from public.payments
  where request_key = p_request_key;

  if found then
    if existing_rental_id <> p_rental_id then
      raise exception 'Payment request key is already in use.';
    end if;
    return payment_id;
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
    request_key,
    amount,
    payment_date,
    method,
    reference_number,
    notes
  ) values (
    p_rental_id,
    p_request_key,
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

revoke all on function public.record_rental_payment(uuid, numeric, date, text, uuid, text, text) from public;
grant execute on function public.record_rental_payment(uuid, numeric, date, text, uuid, text, text) to authenticated;
