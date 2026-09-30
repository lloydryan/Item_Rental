-- Demo business data only. No auth user or administrator profile is created here.
-- All IDs are fixed and inserts are conflict-safe so this file can be rerun.

insert into public.item_categories (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'Table', 'Tables for small and medium events'),
  ('22222222-2222-2222-2222-222222222222', 'Chair', 'Guest and seminar chairs'),
  ('33333333-3333-3333-3333-333333333333', 'Speaker', 'Portable sound system rentals'),
  ('44444444-4444-4444-4444-444444444444', 'Tent', 'Outdoor tents and canopies')
on conflict (id) do update set name = excluded.name, description = excluded.description;

insert into public.items (id, category_id, name, description, rental_price, total_quantity, damaged_quantity, missing_quantity, status) values
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Rectangular Table', 'Six-seater event table', 120, 40, 1, 0, 'Available'),
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Round Banquet Table', 'Round table for eight guests', 150, 24, 0, 0, 'Available'),
  ('10000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Monoblock Chair', 'White plastic chair', 12, 200, 4, 2, 'Available'),
  ('10000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Tiffany Chair', 'White chair for formal events', 60, 80, 1, 0, 'Available'),
  ('10000000-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 'JBL PartyBox Speaker', 'Portable speaker with setup support', 700, 6, 0, 0, 'Available'),
  ('10000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444', '3x3 Meter Tent', 'Water-resistant outdoor canopy', 900, 10, 1, 0, 'Available')
on conflict (id) do update set
  category_id = excluded.category_id, name = excluded.name, description = excluded.description,
  rental_price = excluded.rental_price, total_quantity = excluded.total_quantity,
  damaged_quantity = excluded.damaged_quantity, missing_quantity = excluded.missing_quantity,
  status = excluded.status;

insert into public.customers (id, name, contact_number, email, address) values
  ('20000000-0000-0000-0000-000000000001', 'Maria Santos', '0917 555 0142', 'maria@example.com', 'Matina, Davao City'),
  ('20000000-0000-0000-0000-000000000002', 'Davao Seminar Group', '082 227 4412', 'events@seminar.test', 'Poblacion District, Davao City'),
  ('20000000-0000-0000-0000-000000000003', 'Juan Dela Cruz', '0998 144 6722', 'juan@example.com', 'Buhangin, Davao City'),
  ('20000000-0000-0000-0000-000000000004', 'Ana Reyes', '0918 302 1880', 'ana.reyes@example.com', 'Talomo, Davao City'),
  ('20000000-0000-0000-0000-000000000005', 'Northside Events', '0920 440 7611', 'bookings@northside.test', 'Bajada, Davao City')
on conflict (id) do update set
  name = excluded.name, contact_number = excluded.contact_number,
  email = excluded.email, address = excluded.address;

insert into public.reservations (id, customer_id, start_date, end_date, event_location, delivery_required, delivery_charge, additional_charges, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-10-04', '2026-10-05', 'Matina Aplaya Covered Court', true, 500, 0, 'Confirmed'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '2026-10-10', '2026-10-10', 'Downtown Conference Hall', true, 650, 0, 'Ready for Release'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', '2026-09-20', '2026-09-20', 'Buhangin Gymnasium', false, 0, 300, 'Completed'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', '2026-10-18', '2026-10-19', 'Talomo Residence', true, 450, 0, 'Draft'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', '2026-09-27', '2026-09-28', 'Bajada Corporate Center', true, 600, 0, 'Released')
on conflict (id) do update set
  customer_id = excluded.customer_id, start_date = excluded.start_date, end_date = excluded.end_date,
  event_location = excluded.event_location, delivery_required = excluded.delivery_required,
  delivery_charge = excluded.delivery_charge, additional_charges = excluded.additional_charges,
  status = excluded.status;

insert into public.reservation_items (id, reservation_id, item_id, quantity, unit_price) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 80, 12),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 12, 120),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 120, 12),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 2, 700),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 30, 60),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 8, 150),
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 50, 60),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000006', 4, 900),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 2, 700)
on conflict (reservation_id, item_id) do update set quantity = excluded.quantity, unit_price = excluded.unit_price;

insert into public.rental_transactions (id, reservation_id, release_date, expected_return_date, actual_return_date, rental_amount, delivery_charge, additional_charges, status) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', null, '2026-10-05', null, 2400, 500, 0, 'Reserved'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', null, '2026-10-10', null, 2840, 650, 0, 'Ready for Release'),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '2026-09-20', '2026-09-20', '2026-09-20', 1800, 0, 300, 'Completed'),
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005', '2026-09-27', '2026-09-28', null, 5000, 600, 0, 'Active')
on conflict (id) do update set
  reservation_id = excluded.reservation_id, release_date = excluded.release_date,
  expected_return_date = excluded.expected_return_date, actual_return_date = excluded.actual_return_date,
  rental_amount = excluded.rental_amount, delivery_charge = excluded.delivery_charge,
  additional_charges = excluded.additional_charges, status = excluded.status;

insert into public.payments (id, rental_id, amount, payment_date, method, reference_number, notes) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 1500, '2026-09-29', 'Cash', 'OR-1001', 'Reservation down payment'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 1800, '2026-09-28', 'GCash', 'GC-3381', 'Partial payment'),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', 2100, '2026-09-20', 'Cash', 'OR-0997', 'Paid in full'),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', 3000, '2026-09-26', 'Bank Transfer', 'BT-8462', 'Initial payment')
on conflict (id) do update set
  rental_id = excluded.rental_id, amount = excluded.amount, payment_date = excluded.payment_date,
  method = excluded.method, reference_number = excluded.reference_number, notes = excluded.notes;

insert into public.deliveries (id, rental_id, address, delivery_date_time, delivery_charge, delivery_status, pickup_schedule, pickup_status, notes) values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Matina Aplaya Covered Court', '2026-10-04 09:00:00+08', 500, 'Scheduled', '2026-10-05 18:00:00+08', 'Pending', 'Call customer before arrival.'),
  ('70000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', 'Downtown Conference Hall', '2026-10-10 07:30:00+08', 650, 'Scheduled', '2026-10-10 18:00:00+08', 'Pending', 'Bring speaker extension cords.'),
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 'Bajada Corporate Center', '2026-09-27 08:00:00+08', 600, 'Delivered', '2026-09-28 20:00:00+08', 'For Pickup', 'Coordinate pickup with venue security.')
on conflict (id) do update set
  rental_id = excluded.rental_id, address = excluded.address,
  delivery_date_time = excluded.delivery_date_time, delivery_charge = excluded.delivery_charge,
  delivery_status = excluded.delivery_status, pickup_schedule = excluded.pickup_schedule,
  pickup_status = excluded.pickup_status, notes = excluded.notes;

insert into public.return_records (id, rental_id, inspection_date, status, notes) values
  ('80000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', '2026-09-20', 'Completed', 'Final count and inspection completed.')
on conflict (id) do update set
  rental_id = excluded.rental_id, inspection_date = excluded.inspection_date,
  status = excluded.status, notes = excluded.notes;

insert into public.return_items (id, return_record_id, item_id, released_quantity, returned_quantity, damaged_quantity, additional_charge) values
  ('90000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 30, 30, 1, 300)
on conflict (id) do update set
  return_record_id = excluded.return_record_id, item_id = excluded.item_id,
  released_quantity = excluded.released_quantity, returned_quantity = excluded.returned_quantity,
  damaged_quantity = excluded.damaged_quantity, additional_charge = excluded.additional_charge;

insert into public.damage_records (id, return_item_id, item_id, damaged_quantity, missing_quantity, charge_amount, notes) values
  ('a0000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 1, 0, 300, 'One chair returned with a cracked backrest.')
on conflict (id) do update set
  return_item_id = excluded.return_item_id, item_id = excluded.item_id,
  damaged_quantity = excluded.damaged_quantity, missing_quantity = excluded.missing_quantity,
  charge_amount = excluded.charge_amount, notes = excluded.notes;
