create unique index if not exists return_records_rental_unique_idx
  on public.return_records(rental_id);

create unique index if not exists return_items_record_item_unique_idx
  on public.return_items(return_record_id, item_id);

-- Repair rentals that were already marked Returned before this workflow was
-- installed, so inventory staff can inspect them immediately.
insert into public.return_records (rental_id, inspection_date, status)
select
  rental.id,
  coalesce(rental.actual_return_date, current_date),
  'Pending Inspection'
from public.rental_transactions rental
where rental.status = 'Returned'
on conflict (rental_id) do nothing;

insert into public.return_items (
  return_record_id,
  item_id,
  released_quantity,
  returned_quantity,
  damaged_quantity,
  additional_charge
)
select
  return_record.id,
  reservation_item.item_id,
  reservation_item.quantity,
  reservation_item.quantity,
  0,
  0
from public.return_records return_record
join public.rental_transactions rental
  on rental.id = return_record.rental_id
join public.reservation_items reservation_item
  on reservation_item.reservation_id = rental.reservation_id
where rental.status = 'Returned'
on conflict (return_record_id, item_id) do nothing;

create or replace function public.update_rental_status(
  p_rental_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rental_record public.rental_transactions%rowtype;
  return_record_id uuid;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'rental', 'inventory') then
    raise exception 'You do not have permission to update rental transactions.';
  end if;

  if p_status not in ('Reserved', 'Ready for Release', 'Released', 'Active', 'Returned') then
    raise exception 'Returned is the final rental status. Inventory staff complete the return after inspection.';
  end if;

  select * into rental_record
  from public.rental_transactions
  where id = p_rental_id
  for update;

  if not found then
    raise exception 'Rental transaction was not found.';
  end if;

  if rental_record.status = 'Completed' then
    raise exception 'Completed rentals can no longer be changed.';
  end if;

  if rental_record.status = 'Returned' and p_status <> 'Returned' then
    raise exception 'This rental is already awaiting inventory inspection.';
  end if;

  update public.rental_transactions
  set status = p_status::rental_status,
      release_date = case
        when p_status in ('Released', 'Active') then coalesce(release_date, current_date)
        else release_date
      end,
      actual_return_date = case
        when p_status = 'Returned' then coalesce(actual_return_date, current_date)
        else actual_return_date
      end,
      updated_at = now()
  where id = p_rental_id;

  update public.reservations
  set status = case
        when p_status in ('Reserved', 'Ready for Release') then 'Ready for Release'::reservation_status
        else 'Released'::reservation_status
      end,
      updated_at = now()
  where id = rental_record.reservation_id;

  if p_status = 'Returned' then
    insert into public.return_records (rental_id, inspection_date, status)
    values (p_rental_id, current_date, 'Pending Inspection')
    on conflict (rental_id) do update
      set inspection_date = excluded.inspection_date
    returning id into return_record_id;

    insert into public.return_items (
      return_record_id,
      item_id,
      released_quantity,
      returned_quantity,
      damaged_quantity,
      additional_charge
    )
    select
      return_record_id,
      reservation_item.item_id,
      reservation_item.quantity,
      reservation_item.quantity,
      0,
      0
    from public.reservation_items reservation_item
    where reservation_item.reservation_id = rental_record.reservation_id
    on conflict (return_record_id, item_id) do nothing;
  end if;
end;
$$;

drop function if exists public.complete_return_inspection(uuid);

create or replace function public.complete_return_inspection(
  p_return_record_id uuid,
  p_notes text,
  p_items jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  return_record public.return_records%rowtype;
  line_count integer;
  submitted_count integer;
  total_charges numeric(10, 2);
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'inventory') then
    raise exception 'Only inventory staff can complete a return inspection.';
  end if;

  select * into return_record
  from public.return_records
  where id = p_return_record_id
  for update;

  if not found then
    raise exception 'Return record was not found.';
  end if;

  if return_record.status = 'Completed' then
    return;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Return items must be provided as a list.';
  end if;

  select count(*) into line_count
  from public.return_items
  where return_record_id = p_return_record_id;

  select count(*) into submitted_count
  from jsonb_array_elements(p_items);

  if submitted_count <> line_count or exists (
    select 1
    from public.return_items return_item
    where return_item.return_record_id = p_return_record_id
      and not exists (
        select 1
        from jsonb_array_elements(p_items) submitted
        where submitted->>'id' = return_item.id::text
      )
  ) then
    raise exception 'Every item in the return must be inspected exactly once.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) submitted
    left join public.return_items return_item
      on return_item.id = (submitted->>'id')::uuid
      and return_item.return_record_id = p_return_record_id
    where return_item.id is null
      or (submitted->>'returnedQuantity')::integer < 0
      or (submitted->>'returnedQuantity')::integer > return_item.released_quantity
      or (submitted->>'damagedQuantity')::integer < 0
      or (submitted->>'damagedQuantity')::integer > (submitted->>'returnedQuantity')::integer
      or (submitted->>'additionalCharge')::numeric < 0
  ) then
    raise exception 'Check the returned, damaged, and charge values for each item.';
  end if;

  with submitted as (
    select
      (value->>'id')::uuid as id,
      (value->>'returnedQuantity')::integer as returned_quantity,
      (value->>'damagedQuantity')::integer as damaged_quantity,
      (value->>'additionalCharge')::numeric(10, 2) as additional_charge
    from jsonb_array_elements(p_items)
  )
  update public.return_items return_item
  set returned_quantity = submitted.returned_quantity,
      damaged_quantity = submitted.damaged_quantity,
      additional_charge = submitted.additional_charge
  from submitted
  where return_item.id = submitted.id
    and return_item.return_record_id = p_return_record_id;

  update public.return_records
  set notes = nullif(trim(p_notes), '')
  where id = p_return_record_id;

  delete from public.damage_records
  where return_item_id in (
    select id from public.return_items where return_record_id = p_return_record_id
  );

  insert into public.damage_records (
    return_item_id,
    item_id,
    damaged_quantity,
    missing_quantity,
    charge_amount,
    notes
  )
  select
    return_item.id,
    return_item.item_id,
    return_item.damaged_quantity,
    greatest(0, return_item.released_quantity - return_item.returned_quantity),
    return_item.additional_charge,
    nullif(trim(p_notes), '')
  from public.return_items return_item
  where return_item.return_record_id = p_return_record_id
    and (
      return_item.damaged_quantity > 0
      or return_item.returned_quantity < return_item.released_quantity
      or return_item.additional_charge > 0
    );

  update public.items item
  set damaged_quantity = item.damaged_quantity + totals.damaged_quantity,
      missing_quantity = item.missing_quantity + totals.missing_quantity,
      updated_at = now()
  from (
    select
      item_id,
      sum(damaged_quantity)::integer as damaged_quantity,
      sum(greatest(0, released_quantity - returned_quantity))::integer as missing_quantity
    from public.return_items
    where return_record_id = p_return_record_id
    group by item_id
  ) totals
  where item.id = totals.item_id;

  select coalesce(sum(additional_charge), 0) into total_charges
  from public.return_items
  where return_record_id = p_return_record_id;

  update public.rental_transactions
  set status = 'Completed',
      actual_return_date = coalesce(actual_return_date, current_date),
      additional_charges = additional_charges + total_charges,
      updated_at = now()
  where id = return_record.rental_id;

  update public.reservations reservation
  set status = 'Completed',
      updated_at = now()
  from public.rental_transactions rental
  where rental.id = return_record.rental_id
    and reservation.id = rental.reservation_id;

  update public.return_records
  set status = 'Completed'
  where id = p_return_record_id;
end;
$$;

revoke all on function public.update_rental_status(uuid, text) from public;
revoke all on function public.complete_return_inspection(uuid, text, jsonb) from public;
grant execute on function public.update_rental_status(uuid, text) to authenticated;
grant execute on function public.complete_return_inspection(uuid, text, jsonb) to authenticated;
