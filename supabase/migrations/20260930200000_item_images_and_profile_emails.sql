alter table public.items
add column if not exists image_url text;

alter table public.profiles
add column if not exists email text;

create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images',
  'item-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff view item images" on storage.objects;
create policy "staff view item images"
on storage.objects for select
to authenticated
using (bucket_id = 'item-images');

drop policy if exists "inventory staff upload item images" on storage.objects;
create policy "inventory staff upload item images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'item-images'
  and public.current_app_role() in ('owner', 'inventory')
);

drop policy if exists "inventory staff update item images" on storage.objects;
create policy "inventory staff update item images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'item-images'
  and public.current_app_role() in ('owner', 'inventory')
)
with check (
  bucket_id = 'item-images'
  and public.current_app_role() in ('owner', 'inventory')
);

drop policy if exists "inventory staff delete item images" on storage.objects;
create policy "inventory staff delete item images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'item-images'
  and public.current_app_role() in ('owner', 'inventory')
);
