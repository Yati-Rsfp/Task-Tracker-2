-- Run this entire file in Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'member', -- 'admin' or 'member'
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "Users can read all profiles" on profiles;
create policy "Users can read all profiles" on profiles for select using (auth.uid() is not null);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

grant usage on schema public to anon, authenticated;
grant select on table profiles to authenticated;
grant update on table profiles to authenticated;

create or replace function admin_set_profile_role(target_id uuid, target_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can update roles';
  end if;

  update profiles
  set role = target_role
  where id = target_id;
end;
$$;

grant execute on function admin_set_profile_role(uuid, text) to authenticated;

-- 0. Task mentions table (who was tagged on a task)
create table if not exists task_mentions (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks on delete cascade not null,
  user_name text not null,
  mentioned_by text,
  created_at timestamptz default now()
);
create unique index if not exists task_mentions_task_user_unique on task_mentions(task_id, user_name);
alter table task_mentions enable row level security;
drop policy if exists "Authenticated users can read task mentions" on task_mentions;
create policy "Authenticated users can read task mentions" on task_mentions for select using (auth.uid() is not null);
drop policy if exists "Authenticated users can add task mentions" on task_mentions;
create policy "Authenticated users can add task mentions" on task_mentions for insert with check (auth.uid() is not null);

grant select, insert on table task_mentions to authenticated;

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
drop policy if exists "All authenticated users can read tasks" on tasks;
create policy "All authenticated users can read tasks" on tasks for select using (auth.uid() is not null);
drop policy if exists "Admins can insert tasks" on tasks;
create policy "Admins can insert tasks" on tasks for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "Admins can update all tasks" on tasks;
create policy "Admins can update all tasks" on tasks for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "Members can update their own tasks status" on tasks;
create policy "Members can update their own tasks status" on tasks for update using (
  assigned_to = (select name from profiles where id = auth.uid())
);
drop policy if exists "Admins can delete tasks" on tasks;
create policy "Admins can delete tasks" on tasks for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

grant select on table tasks to authenticated;
grant insert, update, delete on table tasks to authenticated;

create or replace function block_member_task_field_edits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    return new;
  end if;

  if new.title is distinct from old.title
    or new.note is distinct from old.note
    or new.priority is distinct from old.priority
    or new.assigned_to is distinct from old.assigned_to
    or new.start_date is distinct from old.start_date
    or new.deadline is distinct from old.deadline
    or new.target_date is distinct from old.target_date
    or new.created_by is distinct from old.created_by then
    raise exception 'Members can only update task status';
  end if;

  return new;
end;
$$;

drop trigger if exists task_member_update_guard on tasks;
create trigger task_member_update_guard
before update on tasks
for each row execute procedure block_member_task_field_edits();

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
drop policy if exists "All authenticated can read remarks" on remarks;
create policy "All authenticated can read remarks" on remarks for select using (auth.uid() is not null);
drop policy if exists "Authenticated users can add remarks" on remarks;
create policy "Authenticated users can add remarks" on remarks for insert with check (auth.uid() is not null);

grant select, insert on table remarks to authenticated;

create or replace function sync_task_mentions_from_remark()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into task_mentions (task_id, user_name, mentioned_by)
  select
    new.task_id,
    lower(p.name),
    new.author
  from profiles p
  where lower(new.text) like '%' || '@' || lower(p.name) || '%'
  on conflict (task_id, user_name) do nothing;

  return new;
end;
$$;

drop trigger if exists remarks_sync_task_mentions on remarks;
create trigger remarks_sync_task_mentions
after insert on remarks
for each row execute procedure sync_task_mentions_from_remark();

insert into task_mentions (task_id, user_name, mentioned_by)
select distinct
  r.task_id,
  lower(p.name),
  r.author
from remarks r
join profiles p on lower(r.text) like '%' || '@' || lower(p.name) || '%'
on conflict (task_id, user_name) do nothing;

-- 4. Seed your existing tasks (run after creating accounts)
-- INSERT INTO tasks (title, status, priority, assigned_to, note, deadline) VALUES
-- ('Reel / Influencer / Post ideas for Millet Bar', 'running', 'medium', 'Kunal', 'Ongoing content ideation', null),
-- Add more as needed...

-- 5. Realtime (enable for live updates)
do $$
begin
  alter publication supabase_realtime add table tasks;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table remarks;
exception
  when duplicate_object then null;
end $$;
