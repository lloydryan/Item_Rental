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
begin
  if coalesce(public.current_app_role()::text, '') not in ('owner', 'rental', 'inventory') then
    raise exception 'You do not have permission to update rental transactions.';
  end if;

  if p_status not in ('Reserved', 'Ready for Release', 'Released', 'Active', 'Returned', 'Completed') then
    raise exception 'Choose a valid non-cancellation rental status.';
  end if;

  select * into rental_record
  from public.rental_transactions
  where id = p_rental_id
  for update;

  if not found then
    raise exception 'Rental transaction was not found.';
  end if;

  update public.rental_transactions
  set status = p_status::rental_status,
      release_date = case
        when p_status in ('Released', 'Active') then coalesce(release_date, current_date)
        else release_date
      end,
      actual_return_date = case
        when p_status in ('Returned', 'Completed') then coalesce(actual_return_date, current_date)
        else actual_return_date
      end,
      updated_at = now()
  where id = p_rental_id;

  update public.reservations
  set status = case
        when p_status in ('Reserved', 'Ready for Release') then 'Ready for Release'::reservation_status
        when p_status in ('Released', 'Active', 'Returned') then 'Released'::reservation_status
        when p_status = 'Completed' then 'Completed'::reservation_status
      end,
      updated_at = now()
  where id = rental_record.reservation_id;
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

