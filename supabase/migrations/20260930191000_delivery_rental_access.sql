create policy "delivery staff read assigned rentals"
on public.rental_transactions
for select
to authenticated
using (
  public.current_app_role() = 'delivery'
  and exists (
    select 1
    from public.deliveries
    where deliveries.rental_id = rental_transactions.id
      and deliveries.assigned_user_id = auth.uid()
  )
);
