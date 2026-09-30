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
  rental_id uuid not null references public.rental_transactions(id) on delete cascade,
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
  additional_charge numeric(10, 2) not null default 0 check (additional_charge >= 0)
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

create index reservations_date_idx on public.reservations(start_date, end_date);
create index reservation_items_item_idx on public.reservation_items(item_id);
create index payments_rental_idx on public.payments(rental_id);
create index deliveries_assigned_idx on public.deliveries(assigned_user_id);

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
create policy "rental staff manage payments" on public.payments for all to authenticated using (public.current_app_role() in ('owner', 'rental')) with check (public.current_app_role() in ('owner', 'rental'));
create policy "delivery staff manage assigned deliveries" on public.deliveries for all to authenticated using (public.current_app_role() in ('owner', 'rental') or assigned_user_id = auth.uid()) with check (public.current_app_role() in ('owner', 'rental') or assigned_user_id = auth.uid());
create policy "inventory staff manage returns" on public.return_records for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff manage return items" on public.return_items for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
create policy "inventory staff manage damages" on public.damage_records for all to authenticated using (public.current_app_role() in ('owner', 'inventory')) with check (public.current_app_role() in ('owner', 'inventory'));
