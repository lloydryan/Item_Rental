create extension if not exists "pgcrypto";

create type app_role as enum ('owner', 'rental', 'inventory', 'delivery');
create type item_status as enum ('Available', 'Reserved', 'Rented', 'Damaged', 'Under Maintenance', 'Missing');
create type reservation_status as enum ('Draft', 'Confirmed', 'Ready for Release', 'Released', 'Completed', 'Cancelled');
create type rental_status as enum ('Reserved', 'Ready for Release', 'Released', 'Active', 'Returned', 'Completed', 'Cancelled');
create type delivery_status as enum ('Pending', 'Scheduled', 'Out for Delivery', 'Delivered', 'For Pickup', 'Picked Up', 'Completed');
create type return_status as enum ('Pending Inspection', 'Completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role app_role not null default 'rental',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_number text not null,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.item_categories(id),
  name text not null,
  description text,
  image_url text,
  rental_price numeric(10, 2) not null default 0 check (rental_price >= 0),
  total_quantity integer not null check (total_quantity >= 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  missing_quantity integer not null default 0 check (missing_quantity >= 0),
  status item_status not null default 'Available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (damaged_quantity + missing_quantity <= total_quantity)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  start_date date not null,
  end_date date not null,
  event_location text not null,
  delivery_required boolean not null default false,
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  additional_charges numeric(10, 2) not null default 0 check (additional_charges >= 0),
  status reservation_status not null default 'Draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  item_id uuid not null references public.items(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  unique (reservation_id, item_id)
);

create table public.rental_transactions (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id),
  release_date date,
  expected_return_date date not null,
  actual_return_date date,
  rental_amount numeric(10, 2) not null default 0 check (rental_amount >= 0),
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  additional_charges numeric(10, 2) not null default 0 check (additional_charges >= 0),
  status rental_status not null default 'Reserved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rental_transactions(id) on delete cascade,
  request_key uuid not null default gen_random_uuid() unique,
  amount numeric(10, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  method text not null default 'Cash',
  reference_number text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rental_transactions(id) on delete cascade,
  address text not null,
  delivery_date_time timestamptz,
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  delivery_status delivery_status not null default 'Pending',
  pickup_schedule timestamptz,
  pickup_status delivery_status not null default 'Pending',
  assigned_user_id uuid references public.profiles(id),
  notes text
);

create table public.return_records (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rental_transactions(id) on delete cascade,
  inspection_date date not null default current_date,
  status return_status not null default 'Pending Inspection',
  notes text,
  created_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_record_id uuid not null references public.return_records(id) on delete cascade,
  item_id uuid not null references public.items(id),
  released_quantity integer not null check (released_quantity >= 0),
  returned_quantity integer not null check (returned_quantity >= 0),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  additional_charge numeric(10, 2) not null default 0 check (additional_charge >= 0),
  unique (return_record_id, item_id)
);

create table public.damage_records (
  id uuid primary key default gen_random_uuid(),
  return_item_id uuid not null references public.return_items(id) on delete cascade,
  item_id uuid not null references public.items(id),
  damaged_quantity integer not null default 0 check (damaged_quantity >= 0),
  missing_quantity integer not null default 0 check (missing_quantity >= 0),
  charge_amount numeric(10, 2) not null default 0 check (charge_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
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

create table public.inventory_stock_adjustments (
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

create index reservations_date_idx on public.reservations(start_date, end_date);
create index reservation_items_item_idx on public.reservation_items(item_id);
create index payments_rental_idx on public.payments(rental_id);
create index deliveries_assigned_idx on public.deliveries(assigned_user_id);
create unique index profiles_email_unique_idx on public.profiles (lower(email)) where email is not null;
create index inventory_movements_item_idx on public.inventory_movements(item_id, status);
create index inventory_movements_created_at_idx on public.inventory_movements(created_at desc);
create index inventory_stock_adjustments_item_idx on public.inventory_stock_adjustments(item_id, created_at desc);

create or replace function public.item_committed_quantity(
  p_item_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_reservation_id uuid default null
) returns integer
language sql
stable
as $$
  select coalesce(sum(ri.quantity), 0)::integer
  from public.reservation_items ri
  join public.reservations r on r.id = ri.reservation_id
  where ri.item_id = p_item_id
    and r.status not in ('Cancelled', 'Completed')
    and (p_exclude_reservation_id is null or r.id <> p_exclude_reservation_id)
    and r.start_date <= p_end_date
    and p_start_date <= r.end_date;
$$;

create or replace function public.item_available_quantity(
  p_item_id uuid,
  p_start_date date,
  p_end_date date,
  p_exclude_reservation_id uuid default null
) returns integer
language sql
stable
as $$
  select greatest(
    0,
    i.total_quantity
    - i.damaged_quantity
    - i.missing_quantity
    - public.item_committed_quantity(p_item_id, p_start_date, p_end_date, p_exclude_reservation_id)
  )::integer
  from public.items i
  where i.id = p_item_id;
$$;

create or replace function public.prevent_overbooking()
returns trigger
language plpgsql
as $$
declare
  rental_window record;
  available integer;
begin
  select start_date, end_date into rental_window
  from public.reservations
  where id = new.reservation_id;

  select public.item_available_quantity(new.item_id, rental_window.start_date, rental_window.end_date, new.reservation_id)
  into available;

  if new.quantity > available then
    raise exception 'Only % item(s) are available for the selected rental date range.', available;
  end if;

  return new;
end;
$$;

create trigger reservation_items_prevent_overbooking
before insert or update on public.reservation_items
for each row execute function public.prevent_overbooking();

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.item_categories enable row level security;
alter table public.items enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.rental_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.deliveries enable row level security;
alter table public.return_records enable row level security;
alter table public.return_items enable row level security;
alter table public.damage_records enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.inventory_stock_adjustments enable row level security;

create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create policy "owners manage profiles" on public.profiles for all to authenticated using (public.current_app_role() = 'owner') with check (public.current_app_role() = 'owner');
create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.current_app_role() = 'owner');

create policy "staff read customers" on public.customers for select to authenticated using (public.current_app_role() is not null);
create policy "rental staff manage customers" on public.customers for all to authenticated using (public.current_app_role() in ('owner', 'rental')) with check (public.current_app_role() in ('owner', 'rental'));
create policy "staff read categories" on public.item_categories for select to authenticated using (public.current_app_role() is not null);
create policy "inventory staff manage categories" on public.item_categories for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "staff read items" on public.items for select to authenticated using (public.current_app_role() is not null);
create policy "inventory staff manage items" on public.items for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "staff read reservations" on public.reservations for select to authenticated using (public.current_app_role() is not null);
create policy "rental staff manage reservations" on public.reservations for all to authenticated using (public.current_app_role() in ('owner', 'rental')) with check (public.current_app_role() in ('owner', 'rental'));
create policy "staff read reservation items" on public.reservation_items for select to authenticated using (public.current_app_role() is not null);
create policy "rental staff manage reservation items" on public.reservation_items for all to authenticated using (public.current_app_role() in ('owner', 'rental')) with check (public.current_app_role() in ('owner', 'rental'));
create policy "staff manage rentals" on public.rental_transactions for all to authenticated using (public.current_app_role() in ('owner', 'rental', 'inventory')) with check (public.current_app_role() in ('owner', 'rental', 'inventory'));
create policy "delivery staff read assigned rentals" on public.rental_transactions for select to authenticated using (public.current_app_role() = 'delivery' and exists (select 1 from public.deliveries where deliveries.rental_id = rental_transactions.id and deliveries.assigned_user_id = auth.uid()));
create policy "rental staff manage payments" on public.payments for all to authenticated using (public.current_app_role() in ('owner', 'rental')) with check (public.current_app_role() in ('owner', 'rental'));
create policy "delivery staff manage assigned deliveries" on public.deliveries for all to authenticated using (public.current_app_role() in ('owner', 'rental') or assigned_user_id = auth.uid()) with check (public.current_app_role() in ('owner', 'rental') or assigned_user_id = auth.uid());
create policy "inventory staff manage returns" on public.return_records for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff manage return items" on public.return_items for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff manage damages" on public.damage_records for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff read movements" on public.inventory_movements for select to authenticated using (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff read stock adjustments" on public.inventory_stock_adjustments for select to authenticated using (public.current_app_role() in ('owner', 'inventory'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "staff view item images" on storage.objects for select to authenticated using (bucket_id = 'item-images');
create policy "inventory staff upload item images" on storage.objects for insert to authenticated with check (bucket_id = 'item-images' and public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff update item images" on storage.objects for update to authenticated using (bucket_id = 'item-images' and public.current_app_role() in ('owner', 'inventory')) with check (bucket_id = 'item-images' and public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff delete item images" on storage.objects for delete to authenticated using (bucket_id = 'item-images' and public.current_app_role() in ('owner', 'inventory'));

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
    return_item_id, item_id, damaged_quantity, missing_quantity, charge_amount, notes
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
    and (return_item.damaged_quantity > 0 or return_item.returned_quantity < return_item.released_quantity or return_item.additional_charge > 0);

  update public.items item
  set damaged_quantity = item.damaged_quantity + totals.damaged_quantity,
      missing_quantity = item.missing_quantity + totals.missing_quantity,
      updated_at = now()
  from (
    select item_id,
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
  set status = 'Completed', updated_at = now()
  from public.rental_transactions rental
  where rental.id = return_record.rental_id
    and reservation.id = rental.reservation_id;

  update public.return_records
  set status = 'Completed'
  where id = p_return_record_id;
end;
$$;

revoke all on function public.complete_return_inspection(uuid, text, jsonb) from public;
grant execute on function public.complete_return_inspection(uuid, text, jsonb) to authenticated;

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
security invoker
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
    update public.items set total_quantity = total_quantity + adjustment_quantity, updated_at = now() where id = p_item_id;
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
    join public.reservation_items reservation_item on reservation_item.reservation_id = reservation.id and reservation_item.item_id = p_item_id
    where reservation.status not in ('Cancelled', 'Completed');

    available_to_remove := greatest(0, coalesce(available_to_remove, 0));
    if p_quantity > available_to_remove then
      raise exception 'Only % uncommitted item(s) can be removed.', available_to_remove;
    end if;
    adjustment_quantity := p_quantity;
    update public.items set total_quantity = total_quantity - adjustment_quantity, updated_at = now() where id = p_item_id;
  else
    adjustment_quantity := item_record.damaged_quantity + item_record.missing_quantity;
    if adjustment_quantity < 1 then
      raise exception 'This item has no unavailable stock to dispose.';
    end if;
    update public.items
    set total_quantity = total_quantity - adjustment_quantity, damaged_quantity = 0, missing_quantity = 0, updated_at = now()
    where id = p_item_id;
  end if;

  insert into public.inventory_stock_adjustments (
    item_id, adjustment_type, quantity, damaged_quantity, missing_quantity, reason, created_by
  ) values (
    p_item_id,
    p_adjustment_type,
    adjustment_quantity,
    case when p_adjustment_type = 'Dispose Unavailable' then item_record.damaged_quantity else 0 end,
    case when p_adjustment_type = 'Dispose Unavailable' then item_record.missing_quantity else 0 end,
    reason_text,
    auth.uid()
  ) returning id into adjustment_id;

  return adjustment_id;
end;
$$;

revoke all on function public.adjust_item_stock(uuid, text, integer, text) from public;
grant execute on function public.adjust_item_stock(uuid, text, integer, text) to authenticated;

create or replace function public.update_reservation_status(
  p_reservation_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status reservation_status;
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'rental') then
    raise exception 'You do not have permission to update reservations.';
  end if;

  if p_status not in ('Confirmed', 'Cancelled') then
    raise exception 'Reservation status can only be changed to Confirmed or Cancelled.';
  end if;

  select status into current_status
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation was not found.';
  end if;

  if exists (
    select 1
    from public.rental_transactions
    where reservation_id = p_reservation_id
  ) then
    raise exception 'This reservation already has a rental transaction and can no longer be cancelled or reconfirmed.';
  end if;

  if current_status::text = p_status then
    return;
  end if;

  if p_status = 'Confirmed' and current_status <> 'Draft' then
    raise exception 'Only draft reservations can be confirmed.';
  end if;

  if p_status = 'Cancelled' and current_status not in ('Draft', 'Confirmed') then
    raise exception 'Only draft or confirmed reservations can be cancelled.';
  end if;

  update public.reservations
  set status = p_status::reservation_status,
      updated_at = now()
  where id = p_reservation_id;
end;
$$;

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
        when p_status in ('Released', 'Active', 'Returned') then 'Released'::reservation_status
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
      return_record_id, item_id, released_quantity, returned_quantity,
      damaged_quantity, additional_charge
    )
    select
      v_return_record_id, reservation_item.item_id, reservation_item.quantity,
      reservation_item.quantity, 0, 0
    from public.reservation_items reservation_item
    where reservation_item.reservation_id = rental_record.reservation_id
    on conflict (return_record_id, item_id) do nothing;
  end if;
end;
$$;

create or replace function public.prevent_rental_cancellation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Cancelled' then
    raise exception 'Rental transactions cannot be cancelled after they are created.';
  end if;

  return new;
end;
$$;

drop trigger if exists rental_transactions_prevent_cancellation on public.rental_transactions;
create trigger rental_transactions_prevent_cancellation
before insert or update of status on public.rental_transactions
for each row execute function public.prevent_rental_cancellation();

create or replace function public.prevent_late_reservation_cancellation()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Cancelled'
    and old.status <> 'Cancelled'
    and exists (
      select 1
      from public.rental_transactions
      where reservation_id = new.id
    )
  then
    raise exception 'Reservations with rental transactions can no longer be cancelled.';
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_prevent_late_cancellation on public.reservations;
create trigger reservations_prevent_late_cancellation
before update of status on public.reservations
for each row execute function public.prevent_late_reservation_cancellation();

revoke all on function public.update_reservation_status(uuid, text) from public;
revoke all on function public.update_rental_status(uuid, text) from public;
grant execute on function public.update_reservation_status(uuid, text) to authenticated;
grant execute on function public.update_rental_status(uuid, text) to authenticated;

create or replace function public.record_rental_payment(
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

-- Sample data lives in supabase/seed.sql. Authentication users and the first
-- owner profile are intentionally not seeded so they can be created manually.
