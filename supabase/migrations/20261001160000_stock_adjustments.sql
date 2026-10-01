create table if not exists public.inventory_stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  adjustment_type text not null check (adjustment_type in ('Add', 'Remove', 'Dispose Unavailable')),
  quantity integer not null check (quantity > 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  missing_quantity integer not null default 0 check (missing_quantity >= 0),
  reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (
    (adjustment_type = 'Dispose Unavailable' and quantity = damaged_quantity + missing_quantity)
    or (adjustment_type in ('Add', 'Remove') and damaged_quantity = 0 and missing_quantity = 0)
  )
);

create index if not exists inventory_stock_adjustments_item_idx
  on public.inventory_stock_adjustments(item_id, created_at desc);

alter table public.inventory_stock_adjustments enable row level security;

create policy "inventory staff read stock adjustments"
on public.inventory_stock_adjustments for select
to authenticated
using (public.current_app_role() in ('owner', 'inventory'));

create or replace function public.adjust_item_stock(
  p_item_id uuid,
  p_adjustment_type text,
  p_quantity integer default null,
  p_reason text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record public.items%rowtype;
  adjustment_id uuid;
  adjustment_quantity integer;
  available_to_remove integer;
  reason_text text;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'inventory') then
    raise exception 'You do not have permission to adjust inventory stock.';
  end if;

  if p_adjustment_type not in ('Add', 'Remove', 'Dispose Unavailable') then
    raise exception 'Choose Add, Remove, or Dispose Unavailable.';
  end if;

  select * into item_record
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item was not found.';
  end if;

  reason_text := nullif(trim(p_reason), '');

  if p_adjustment_type = 'Add' then
    if p_quantity is null or p_quantity < 1 then
      raise exception 'Quantity must be at least one.';
    end if;

    adjustment_quantity := p_quantity;
    update public.items
    set total_quantity = total_quantity + adjustment_quantity,
        updated_at = now()
    where id = p_item_id;

  elsif p_adjustment_type = 'Remove' then
    if p_quantity is null or p_quantity < 1 then
      raise exception 'Quantity must be at least one.';
    end if;
    if reason_text is null then
      raise exception 'A reason is required when removing stock.';
    end if;

    select least(
      public.item_available_quantity(p_item_id, current_date, current_date),
      coalesce(min(public.item_available_quantity(p_item_id, reservation.start_date, reservation.end_date)), item_record.total_quantity - item_record.damaged_quantity - item_record.missing_quantity)
    )
    into available_to_remove
    from public.reservations reservation
    join public.reservation_items reservation_item
      on reservation_item.reservation_id = reservation.id
     and reservation_item.item_id = p_item_id
    where reservation.status not in ('Cancelled', 'Completed');

    available_to_remove := greatest(0, coalesce(available_to_remove, 0));
    if p_quantity > available_to_remove then
      raise exception 'Only % uncommitted item(s) can be removed.', available_to_remove;
    end if;

    adjustment_quantity := p_quantity;
    update public.items
    set total_quantity = total_quantity - adjustment_quantity,
        updated_at = now()
    where id = p_item_id;

  else
    adjustment_quantity := item_record.damaged_quantity + item_record.missing_quantity;
    if adjustment_quantity < 1 then
      raise exception 'This item has no unavailable stock to dispose.';
    end if;

    update public.items
    set total_quantity = total_quantity - adjustment_quantity,
        damaged_quantity = 0,
        missing_quantity = 0,
        updated_at = now()
    where id = p_item_id;
  end if;

  insert into public.inventory_stock_adjustments (
    item_id,
    adjustment_type,
    quantity,
    damaged_quantity,
    missing_quantity,
    reason,
    created_by
  ) values (
    p_item_id,
    p_adjustment_type,
    adjustment_quantity,
    case when p_adjustment_type = 'Dispose Unavailable' then item_record.damaged_quantity else 0 end,
    case when p_adjustment_type = 'Dispose Unavailable' then item_record.missing_quantity else 0 end,
    reason_text,
    auth.uid()
  )
  returning id into adjustment_id;

  return adjustment_id;
end;
$$;

revoke all on function public.adjust_item_stock(uuid, text, integer, text) from public;
grant execute on function public.adjust_item_stock(uuid, text, integer, text) to authenticated;
