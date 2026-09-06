create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text not null,
  category text not null,
  description text not null,
  page_url text null,
  user_agent text null,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feedback_reports enable row level security;

-- No anon/authenticated policies on purpose.
-- Reports are written only by the server-side service-role API and reviewed in Supabase.

create index if not exists feedback_reports_created_at_idx
  on public.feedback_reports (created_at desc);

create index if not exists feedback_reports_status_idx
  on public.feedback_reports (status, created_at desc);
