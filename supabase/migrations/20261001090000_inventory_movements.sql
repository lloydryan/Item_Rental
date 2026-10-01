create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  movement_type text not null check (movement_type in ('Maintenance', 'Repair')),
  quantity integer not null check (quantity > 0),
  notes text,
  status text not null default 'In Progress' check (status in ('In Progress', 'Completed')),
  created_by uuid not null references public.profiles(id),
  completed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (
    (status = 'In Progress' and completed_by is null and completed_at is null)
    or (status = 'Completed' and completed_by is not null and completed_at is not null)
  )
);

create index if not exists inventory_movements_item_idx
on public.inventory_movements(item_id, status);

create index if not exists inventory_movements_created_at_idx
on public.inventory_movements(created_at desc);

alter table public.inventory_movements enable row level security;

create policy "inventory staff read movements"
on public.inventory_movements for select
to authenticated
using (public.current_app_role() in ('owner', 'inventory'));

create or replace function public.start_inventory_movement(
  p_item_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_notes text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_id uuid;
  available integer;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'inventory') then
    raise exception 'You do not have permission to update inventory.';
  end if;

  if p_movement_type not in ('Maintenance', 'Repair') then
    raise exception 'Choose Maintenance or Repair.';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least one.';
  end if;

  perform 1 from public.items where id = p_item_id for update;
  if not found then
    raise exception 'Item was not found.';
  end if;

  select public.item_available_quantity(p_item_id, current_date, current_date)
  into available;

  if p_quantity > available then
    raise exception 'Only % item(s) are currently available.', available;
  end if;

  insert into public.inventory_movements (
    item_id, movement_type, quantity, notes, created_by
  ) values (
    p_item_id, p_movement_type, p_quantity, nullif(trim(p_notes), ''), auth.uid()
  )
  returning id into movement_id;

  update public.items
  set damaged_quantity = damaged_quantity + p_quantity,
      updated_at = now()
  where id = p_item_id;

  return movement_id;
end;
$$;

create or replace function public.complete_inventory_movement(p_movement_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_record public.inventory_movements%rowtype;
  current_damaged_quantity integer;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'inventory') then
    raise exception 'You do not have permission to update inventory.';
  end if;

  select * into movement_record
  from public.inventory_movements
  where id = p_movement_id
  for update;

  if not found then
    raise exception 'Inventory movement was not found.';
  end if;

  if movement_record.status = 'Completed' then
    return;
  end if;

  select damaged_quantity into current_damaged_quantity
  from public.items
  where id = movement_record.item_id
  for update;

  if current_damaged_quantity < movement_record.quantity then
    raise exception 'The unavailable quantity is lower than this movement quantity.';
  end if;

  update public.items
  set damaged_quantity = damaged_quantity - movement_record.quantity,
      updated_at = now()
  where id = movement_record.item_id;

  update public.inventory_movements
  set status = 'Completed',
      completed_by = auth.uid(),
      completed_at = now()
  where id = p_movement_id;
end;
$$;

revoke all on function public.start_inventory_movement(uuid, text, integer, text) from public;
revoke all on function public.complete_inventory_movement(uuid) from public;
grant execute on function public.start_inventory_movement(uuid, text, integer, text) to authenticated;
grant execute on function public.complete_inventory_movement(uuid) to authenticated;
