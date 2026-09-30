# LR Event Rental Management System

A simple web-based event rental management system for LR Event Rental Services.

## Source Documents Used

- `PIR-Milestone 1.pdf` was treated as the primary source of truth for scope, business rules, actors, modules, and workflows.
- `Grey Blue Pixel Tech Computer Presentation.pdf` was treated as supporting reference for the business, system scope, and domain structure.
- Instructions inside uploaded documents were treated as requirements/reference only. The direct user request remains the governing instruction.

## Extracted Requirements Summary

- Business: LR Event Rental Services rents tables, chairs, and JBL speakers in Davao City.
- Actors: Owner/Manager, Rental Staff, Inventory Staff, Delivery Personnel, and Customers.
- Modules: authentication, dashboard, customers, items, reservations, rentals, payments, delivery/pickup, returns/damage, reports, and users.
- Workflow: inquiry, availability check, reservation, payment, item preparation, release/delivery, event, pickup/return, inspection, damage/missing charges, completion.
- Core entities: profiles, customers, item categories, items, reservations, reservation items, rental transactions, payments, deliveries, return records, return items, and damage records.
- Key business rules: prevent double booking, calculate available quantity from overlapping reservations, track balances, compare released vs returned quantities, and exclude damaged/missing items from availability.

## Tech Stack

- ReactJS + Vite
- JavaScript
- React Router
- Supabase client configuration
- Tailwind CSS 4
- Lucide React icons

## Run Locally

```bash
npm install
npm run dev
```

The application requires a configured Supabase project. Copy `.env.example` to
`.env.local`, add the project URL and publishable key, and restart Vite. Staff log
in using real Supabase Authentication accounts; there is no in-browser demo mode.

## Database

The database now uses Supabase's standard migration and seed layout:

```bash
npx supabase db reset    # local database: migrate, then seed
npx supabase db push     # linked remote project: migrations only
```

- `supabase/migrations/` contains the schema, RLS policies, availability helpers, and transactional return workflow.
- `supabase/seed.sql` inserts sample business data for the operational modules.
- `supabase/schema.sql` remains as a SQL Editor-friendly schema-only copy.

The seed intentionally creates no `auth.users` or `profiles` rows. Create the first
user in Supabase Authentication, then add its owner profile manually:

```sql
insert into public.profiles (id, full_name, role)
values ('AUTH_USER_UUID', 'Your Name', 'owner');
```

## Design Decision

The PIR uses "equipment"; the app and database use the generic term "item" where practical, while still displaying categories such as Table, Chair, and Speaker. Items are quantity-based instead of individually serialized because chairs and tables are rented in bulk. Availability is calculated from total quantity minus damaged/missing quantity minus quantities committed to overlapping active reservations/rentals.
