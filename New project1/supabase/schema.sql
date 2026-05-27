create extension if not exists pgcrypto;

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null,
  name text not null,
  image_url text,
  category text default '未分类',
  location text default '未记录位置',
  note text default '',
  featured boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists gallery_items_gallery_id_idx
  on public.gallery_items (gallery_id, updated_at desc);

alter table public.gallery_items enable row level security;

drop policy if exists "Public gallery read" on public.gallery_items;
create policy "Public gallery read"
  on public.gallery_items
  for select
  to anon
  using (true);

drop policy if exists "Public gallery write" on public.gallery_items;
create policy "Public gallery write"
  on public.gallery_items
  for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public image read" on storage.objects;
create policy "Public image read"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'gallery-images');

drop policy if exists "Public image upload" on storage.objects;
create policy "Public image upload"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'gallery-images');
