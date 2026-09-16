-- KMVPhysics V2 secure database setup
-- Run this whole script in Supabase SQL Editor.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  description text,
  file_path text not null,
  file_url text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.notes enable row level security;

drop policy if exists "Public can read published notes" on public.notes;
create policy "Public can read published notes"
on public.notes for select to anon, authenticated
using (published = true);

drop policy if exists "Teacher can manage notes" on public.notes;
create policy "Teacher can manage notes"
on public.notes for all to authenticated
using ((select auth.jwt()->>'email') = 'sheikhakram34@gmail.com')
with check ((select auth.jwt()->>'email') = 'sheikhakram34@gmail.com');

-- Create a Storage bucket named "notes" in Dashboard first.
-- Then run the storage policies below.

drop policy if exists "Public can read note PDFs" on storage.objects;
create policy "Public can read note PDFs"
on storage.objects for select to anon, authenticated
using (bucket_id = 'notes');

drop policy if exists "Teacher can upload note PDFs" on storage.objects;
create policy "Teacher can upload note PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'notes'
  and (select auth.jwt()->>'email') = 'sheikhakram34@gmail.com'
);

drop policy if exists "Teacher can delete note PDFs" on storage.objects;
create policy "Teacher can delete note PDFs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'notes'
  and (select auth.jwt()->>'email') = 'sheikhakram34@gmail.com'
);
