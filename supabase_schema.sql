-- =============================================
-- TEAM TRACKER — Supabase Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- PROFILES table (linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'member', -- 'admin' or 'member'
  vertical text, -- 'dryer', 'barefruit', 'creative', 'management'
  avatar_initials text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, role, avatar_initials)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'member'),
    upper(left(coalesce(new.raw_user_meta_data->>'name', 'U'), 2))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- TASKS table
create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  status text not null default 'pending',
  -- status: 'pending', 'running', 'stuck', 'onhold', 'upcoming', 'done', 'overdue'
  priority text not null default 'medium',
  -- priority: 'high', 'medium', 'low'
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  start_date date,
  deadline date,
  target_date date,
  vertical text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- REMARKS table
create table remarks (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  author_id uuid references profiles(id),
  content text not null,
  auto_generated boolean default false,
  status_changed_from text,
  status_changed_to text,
  created_at timestamptz default now()
);

-- CHECKINS table (morning / evening)
create table checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  type text not null, -- 'morning' or 'evening'
  note text,
  tasks_reviewed int default 0,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table remarks enable row level security;
alter table checkins enable row level security;

-- PROFILES policies
create policy "Profiles are viewable by all users" on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- TASKS policies
create policy "Tasks viewable by all authenticated" on tasks for select using (auth.role() = 'authenticated');
create policy "Admins can insert tasks" on tasks for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or auth.uid() = assigned_to
);
create policy "Admins can update any task" on tasks for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or auth.uid() = assigned_to
);
create policy "Admins can delete tasks" on tasks for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- REMARKS policies
create policy "Remarks viewable by all authenticated" on remarks for select using (auth.role() = 'authenticated');
create policy "Authenticated users can add remarks" on remarks for insert with check (auth.uid() = author_id);

-- CHECKINS policies
create policy "Users see own checkins" on checkins for select using (auth.uid() = user_id);
create policy "Admins see all checkins" on checkins for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Users can insert own checkins" on checkins for insert with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger tasks_updated_at before update on tasks
  for each row execute procedure update_updated_at();

-- Enable realtime
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table remarks;
