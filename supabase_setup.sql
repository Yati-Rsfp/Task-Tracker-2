-- Run this entire file in Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'member', -- 'admin' or 'member'
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can read all profiles" on profiles for select using (auth.uid() is not null);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), coalesce(new.raw_user_meta_data->>'role', 'member'));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

-- 2. Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  note text,
  status text not null default 'pending',
  priority text not null default 'medium',
  assigned_to text not null,
  start_date date,
  deadline date,
  target_date date,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "All authenticated users can read tasks" on tasks for select using (auth.uid() is not null);
create policy "Admins can insert tasks" on tasks for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all tasks" on tasks for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Members can update their own tasks status" on tasks for update using (
  assigned_to = (select name from profiles where id = auth.uid())
);
create policy "Admins can delete tasks" on tasks for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 3. Remarks table
create table if not exists remarks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks on delete cascade not null,
  text text not null,
  author text not null,
  is_auto boolean default false,
  auto_msg text,
  created_at timestamptz default now()
);
alter table remarks enable row level security;
create policy "All authenticated can read remarks" on remarks for select using (auth.uid() is not null);
create policy "Authenticated users can add remarks" on remarks for insert with check (auth.uid() is not null);

-- 4. Seed your existing tasks (run after creating accounts)
-- INSERT INTO tasks (title, status, priority, assigned_to, note, deadline) VALUES
-- ('Reel / Influencer / Post ideas for Millet Bar', 'running', 'medium', 'Kunal', 'Ongoing content ideation', null),
-- Add more as needed...

-- 5. Realtime (enable for live updates)
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table remarks;
