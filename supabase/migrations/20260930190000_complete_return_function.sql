create or replace function public.complete_return_inspection(p_return_record_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_status return_status;
begin
  select status into current_status
  from public.return_records
  where id = p_return_record_id
  for update;

  if current_status is null then
    raise exception 'Return record was not found.';
  end if;

  if current_status = 'Completed' then
    return;
  end if;

  update public.items i
  set
    damaged_quantity = i.damaged_quantity + totals.damaged_quantity,
    missing_quantity = i.missing_quantity + totals.missing_quantity,
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
  where i.id = totals.item_id;

  update public.return_records
  set status = 'Completed'
  where id = p_return_record_id;
end;
$$;

grant execute on function public.complete_return_inspection(uuid) to authenticated;
