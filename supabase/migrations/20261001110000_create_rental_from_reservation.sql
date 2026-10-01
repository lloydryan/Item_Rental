create or replace function public.create_rental_from_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_record public.reservations%rowtype;
  existing_rental_id uuid;
  new_rental_id uuid;
  item_charge numeric(10, 2);
  rental_days integer;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'rental') then
    raise exception 'You do not have permission to create rental transactions.';
  end if;

  select * into reservation_record
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation was not found.';
  end if;

  select id into existing_rental_id
  from public.rental_transactions
  where reservation_id = p_reservation_id;

  if existing_rental_id is not null then
    return existing_rental_id;
  end if;

  if reservation_record.status <> 'Confirmed' then
    raise exception 'Only confirmed reservations can become rentals.';
  end if;

  rental_days := greatest(1, reservation_record.end_date - reservation_record.start_date + 1);

  select coalesce(sum(quantity * unit_price * rental_days), 0)
  into item_charge
  from public.reservation_items
  where reservation_id = p_reservation_id;

  if not exists (
    select 1 from public.reservation_items where reservation_id = p_reservation_id
  ) then
    raise exception 'The reservation has no rental items.';
  end if;

  insert into public.rental_transactions (
    reservation_id,
    expected_return_date,
    rental_amount,
    delivery_charge,
    additional_charges,
    status
  ) values (
    p_reservation_id,
    reservation_record.end_date,
    item_charge,
    reservation_record.delivery_charge,
    reservation_record.additional_charges,
    'Reserved'
  )
  returning id into new_rental_id;

  if reservation_record.delivery_required then
    insert into public.deliveries (
      rental_id,
      address,
      delivery_charge
    ) values (
      new_rental_id,
      reservation_record.event_location,
      reservation_record.delivery_charge
    );
  end if;

  update public.reservations
  set status = 'Ready for Release',
      updated_at = now()
  where id = p_reservation_id;

  return new_rental_id;
end;
$$;

revoke all on function public.create_rental_from_reservation(uuid) from public;
grant execute on function public.create_rental_from_reservation(uuid) to authenticated;

