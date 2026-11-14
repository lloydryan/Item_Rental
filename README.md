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

- React 19 + Next.js App Router
- JavaScript
- Next.js file-based routing
- Supabase client configuration
- Tailwind CSS 4
- Lucide React icons

## Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run `npm run build` to validate the production build,
or `npm run start` to serve it after building.

The application requires a configured Supabase project. Copy `.env.example` to
`.env.local`, add the project URL and publishable key, and restart Next.js. Existing
`.env.local` files with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
continue to work through `next.config.mjs`; new setups should use the
`NEXT_PUBLIC_` names. Staff log
in using real Supabase Authentication accounts; there is no in-browser demo mode.

## Accounts

All accounts use the password `12345678`.

| Name | Email | Password | Role | Status |
| --- | --- | --- | --- | --- |
| Staff 1 | `staff1@gmail.com` | `12345678` | Inventory Staff | Active |
| Staff2 | `staff2@gmail.com` | `12345678` | Rental Staff | Active |
| Rider | `rider@gmail.com` | `12345678` | Delivery Personnel | Active |
| ADMIN | `admin@gmail.com` | `12345678` | Owner / Manager | Active |

## Database

The database now uses Supabase's standard migration and seed layout:

```bash
npx supabase db reset    # local database: migrate, then seed
npx supabase db push     # linked remote project: migrations only
```

- `supabase/migrations/` contains the schema, RLS policies, availability helpers, and transactional return workflow.
- `supabase/seed.sql` inserts sample business data for the operational modules.
- `supabase/schema.sql` remains as a SQL Editor-friendly schema-only copy.
- Item photos are stored in the public `item-images` bucket. Uploads are limited to authenticated owner and inventory roles.
- Owners create authentication accounts from the Users page through the protected `admin-create-user` Edge Function.

The seed intentionally creates no `auth.users` or `profiles` rows. Create the first
user in Supabase Authentication, then add its owner profile manually:

```sql
insert into public.profiles (id, full_name, role)
values ('AUTH_USER_UUID', 'Your Name', 'owner');
```

## Design Decision

The PIR uses "equipment"; the app and database use the generic term "item" where practical, while still displaying categories such as Table, Chair, and Speaker. Items are quantity-based instead of individually serialized because chairs and tables are rented in bulk. Availability is calculated from total quantity minus damaged/missing quantity minus quantities committed to overlapping active reservations/rentals.
