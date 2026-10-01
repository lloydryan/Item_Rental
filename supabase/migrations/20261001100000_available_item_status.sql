-- Item condition and service state now live in the maintenance workflow.
-- Keep the catalog status simple and consistent for all existing records.
update public.items
set status = 'Available'
where status <> 'Available';

alter table public.items
alter column status set default 'Available';
