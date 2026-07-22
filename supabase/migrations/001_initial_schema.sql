-- AheadTime: initial Supabase schema (migrated from Base44 entities)

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  display_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  preferred_theme text check (preferred_theme in ('light', 'dark', 'amoled', 'system')),
  monthly_salary numeric,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep-alive table for flyswatter / cron pings
create table if not exists public.keepalive (
  id int primary key default 1 check (id = 1),
  last_ping timestamptz not null default now()
);

insert into public.keepalive (id, last_ping) values (1, now())
on conflict (id) do nothing;

alter table public.keepalive enable row level security;

create policy "Anyone can read keepalive"
  on public.keepalive for select
  using (true);

create policy "Service role can update keepalive"
  on public.keepalive for update
  using (true);

-- ---------------------------------------------------------------------------
-- Shared entity columns helper pattern
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  icon text default 'FileText',
  color text default 'slate',
  favourite boolean default false,
  sort_order numeric default 0
);

create table if not exists public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  relationship text default 'Self',
  color text default 'slate'
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  category text not null default 'Other',
  expiry_date date,
  preparation_date date,
  notes text,
  attachment_url text,
  attachment_name text,
  renewal_url text,
  recurrence_type text default 'One-time',
  renewal_fee numeric,
  checklist text,
  tags jsonb default '[]'::jsonb,
  reminder_days jsonb default '[]'::jsonb,
  profile_id uuid references public.family_profiles (id) on delete set null,
  profile_name text,
  snoozed_until date,
  archived boolean default false,
  custom_icon text,
  custom_image_url text
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  category text default 'Subscription',
  expiry_date date,
  preparation_date date,
  notes text,
  attachment_url text,
  attachment_name text,
  renewal_url text,
  auto_pay boolean default false,
  recurrence_type text default 'Annual',
  renewal_fee numeric,
  checklist text,
  tags jsonb default '[]'::jsonb,
  reminder_days jsonb default '[]'::jsonb,
  profile_id uuid references public.family_profiles (id) on delete set null,
  profile_name text,
  snoozed_until date,
  archived boolean default false,
  custom_icon text,
  custom_image_url text
);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  category text default 'Gift Voucher',
  store text,
  value numeric,
  expiry_date date,
  notes text,
  attachment_url text,
  attachment_name text,
  tags jsonb default '[]'::jsonb,
  reminder_days jsonb default '[]'::jsonb,
  profile_id uuid references public.family_profiles (id) on delete set null,
  profile_name text,
  snoozed_until date,
  archived boolean default false,
  redeemed boolean default false,
  custom_icon text,
  custom_image_url text
);

create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  name text not null,
  category text default 'Warranty',
  brand text,
  purchase_date date,
  expiry_date date,
  warranty_type text default 'Manufacturer',
  purchase_price numeric,
  notes text,
  attachment_url text,
  attachment_name text,
  checklist text,
  tags jsonb default '[]'::jsonb,
  reminder_days jsonb default '[]'::jsonb,
  profile_id uuid references public.family_profiles (id) on delete set null,
  profile_name text,
  snoozed_until date,
  archived boolean default false,
  custom_icon text,
  custom_image_url text
);

create table if not exists public.renewal_history (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  document_id text not null,
  document_name text,
  renewed_date date not null,
  previous_expiry date,
  new_expiry date not null,
  notes text
);

create table if not exists public.streak_records (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  current_streak numeric default 0,
  best_streak numeric default 0,
  last_check_in date,
  last_claim_date date,
  total_check_ins numeric default 0
);

create table if not exists public.streak_adjustments (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  target_email text not null,
  streak_count numeric not null
);

create table if not exists public.push_broadcasts (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  title text not null,
  message text not null,
  sent_to_count numeric default 0
);

create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  created_by_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now(),
  version text not null,
  title text not null,
  features jsonb default '[]'::jsonb,
  date date
);

-- ---------------------------------------------------------------------------
-- RLS: user-owned rows
-- ---------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'categories', 'family_profiles', 'documents', 'subscriptions',
    'vouchers', 'warranties', 'renewal_history', 'streak_records'
  ] loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format(
      'create policy "Owner select" on public.%I for select using (created_by_id = auth.uid())',
      tbl
    );
    execute format(
      'create policy "Owner insert" on public.%I for insert with check (created_by_id = auth.uid())',
      tbl
    );
    execute format(
      'create policy "Owner update" on public.%I for update using (created_by_id = auth.uid())',
      tbl
    );
    execute format(
      'create policy "Owner delete" on public.%I for delete using (created_by_id = auth.uid())',
      tbl
    );
  end loop;
end $$;

-- Admin-only tables
alter table public.streak_adjustments enable row level security;
alter table public.push_broadcasts enable row level security;
alter table public.changelog_entries enable row level security;

create policy "Authenticated read changelog"
  on public.changelog_entries for select
  using (auth.role() = 'authenticated');

create policy "Admin manage changelog"
  on public.changelog_entries for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Authenticated read broadcasts"
  on public.push_broadcasts for select
  using (auth.role() = 'authenticated');

create policy "Admin manage broadcasts"
  on public.push_broadcasts for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Admin manage streak adjustments"
  on public.streak_adjustments for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for attachments
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "Users upload own attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read attachments"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "Users delete own attachments"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Keepalive ping function (called by cron / flyswatter)
create or replace function public.ping_keepalive()
returns timestamptz
language sql
security definer
as $$
  update public.keepalive set last_ping = now() where id = 1 returning last_ping;
$$;

grant execute on function public.ping_keepalive() to anon, authenticated;
