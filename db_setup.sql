-- 1. Create Profiles Table (Extends Supabase Auth)
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  avatar_initials text,
  role text default 'tenant_admin' check (role in ('saas_admin', 'tenant_admin', 'member')),
  plan text default 'free' check (plan in ('free', 'premium')),
  tenant_id uuid default gen_random_uuid(), -- Used to group users (families/companies)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Transactions Table
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  tenant_id uuid not null, -- Denormalized for easier RLS
  description text not null,
  amount numeric not null,
  date timestamp with time zone not null,
  type text not null,
  category text default 'Geral',
  installments_current integer,
  installments_total integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone
);

-- Ensure updated_at exists (idempotent migration for existing tables)
alter table public.transactions add column if not exists updated_at timestamp with time zone;

-- 3. Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  subject text not null,
  status text default 'open' check (status in ('open', 'closed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.support_tickets enable row level security;

-- Helper function to prevent infinite recursion in RLS policies
-- This function runs with the privileges of the creator (SECURITY DEFINER), bypassing RLS on the profiles table
create or replace function public.is_saas_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'saas_admin'
  );
$$;

-- 5. RLS Policies

-- PROFILES:
-- Admin sees all (Uses function to avoid recursion)
drop policy if exists "Admins can see all profiles" on public.profiles;
create policy "Admins can see all profiles" on public.profiles
  for select using (
    public.is_saas_admin()
  );

-- Users see themselves
drop policy if exists "Users can see own profile" on public.profiles;
create policy "Users can see own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Users can insert own profile (Required for registration/self-healing)
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Admin can update any profile (to change plans)
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles" on public.profiles
  for update using (
    public.is_saas_admin()
  );

-- TRANSACTIONS:
-- Users see tenant transactions
drop policy if exists "Users see tenant transactions" on public.transactions;
create policy "Users see tenant transactions" on public.transactions
  for select using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() 
      and tenant_id = public.transactions.tenant_id
    )
  );

-- Users insert transactions linked to their tenant
drop policy if exists "Users create transactions" on public.transactions;
create policy "Users create transactions" on public.transactions
  for insert with check (
    auth.uid() = user_id
  );

-- Users update own transactions
drop policy if exists "Users update own transactions" on public.transactions;
create policy "Users update own transactions" on public.transactions
  for update using (
    auth.uid() = user_id
  );

-- Users delete own transactions
drop policy if exists "Users delete own transactions" on public.transactions;
create policy "Users delete own transactions" on public.transactions
  for delete using (
    auth.uid() = user_id
  );

-- TICKETS:
-- Admin sees all tickets
drop policy if exists "Admins see all tickets" on public.support_tickets;
create policy "Admins see all tickets" on public.support_tickets
  for all using (
    public.is_saas_admin()
  );

-- Users see only their tickets
drop policy if exists "Users see own tickets" on public.support_tickets;
create policy "Users see own tickets" on public.support_tickets
  for select using (auth.uid() = user_id);

drop policy if exists "Users create tickets" on public.support_tickets;
create policy "Users create tickets" on public.support_tickets
  for insert with check (auth.uid() = user_id);

-- 6. Trigger to create profile on Signup
-- This ensures the profile is created even if the client doesn't have permission (RLS) immediately after signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_initials, role, plan)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(substring(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)) from 1 for 2)),
    'tenant_admin',
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger must be on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. INITIAL SEED: Setup the Admin User
-- IMPORTANT: You must Sign Up normally in the App with 'admin@confin.site', then run this SQL to promote it:
/*
UPDATE public.profiles 
SET role = 'saas_admin', plan = 'premium' 
WHERE email = 'admin@confin.site';
*/
