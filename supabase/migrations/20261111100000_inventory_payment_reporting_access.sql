drop policy if exists "inventory staff read payments" on public.payments;

create policy "inventory staff read payments"
on public.payments
for select
to authenticated
using (public.current_app_role() = 'inventory');
