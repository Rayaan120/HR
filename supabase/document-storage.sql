create table if not exists public.hr_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  file_name text not null,
  file_type text not null,
  file_size bigint not null check (file_size >= 0),
  storage_path text not null unique,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.hr_documents enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('hr-documents', 'hr-documents', false, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "Authenticated staff can list HR documents" on public.hr_documents;
create policy "Authenticated staff can list HR documents"
on public.hr_documents for select to authenticated using (true);

drop policy if exists "Authenticated staff can add HR documents" on public.hr_documents;
create policy "Authenticated staff can add HR documents"
on public.hr_documents for insert to authenticated
with check (uploaded_by = (select auth.uid()));

drop policy if exists "Authenticated staff can delete HR documents" on public.hr_documents;
create policy "Authenticated staff can delete HR documents"
on public.hr_documents for delete to authenticated using (true);

drop policy if exists "Authenticated staff can read HR document files" on storage.objects;
create policy "Authenticated staff can read HR document files"
on storage.objects for select to authenticated
using (bucket_id = 'hr-documents');

drop policy if exists "Authenticated staff can upload HR document files" on storage.objects;
create policy "Authenticated staff can upload HR document files"
on storage.objects for insert to authenticated
with check (bucket_id = 'hr-documents');

drop policy if exists "Authenticated staff can delete HR document files" on storage.objects;
create policy "Authenticated staff can delete HR document files"
on storage.objects for delete to authenticated
using (bucket_id = 'hr-documents');
