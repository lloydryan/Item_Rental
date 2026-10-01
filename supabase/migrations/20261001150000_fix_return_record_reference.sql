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
  v_return_record_id uuid;
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
    returning id into v_return_record_id;

    insert into public.return_items (
      return_record_id,
      item_id,
      released_quantity,
      returned_quantity,
      damaged_quantity,
      additional_charge
    )
    select
      v_return_record_id,
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

revoke all on function public.update_rental_status(uuid, text) from public;
grant execute on function public.update_rental_status(uuid, text) to authenticated;
