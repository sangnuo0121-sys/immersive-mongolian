-- ============================================================================
-- Migration: 0001 - Add Auth / Profiles / XP Rules / Levels
-- ============================================================================
-- 创建 3 张新表：profiles / xp_rules / levels
-- 配套 RLS 策略、trigger、helper function、seed 数据
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles 表
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at bigint not null default (extract(epoch from now()) * 1000)
);

comment on table public.profiles is 'User profiles linked to Supabase auth.users';

-- 索引
create index if not exists idx_profiles_role on public.profiles(role);

-- ----------------------------------------------------------------------------
-- 2. 注册时自动创建 profile
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 删除已有 trigger 再创建
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. is_admin() helper function
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. profiles RLS
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

-- 用户可以更新自己的 display_name/avatar_url，但不能改 role
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- admin 可以更新任何人的资料（包括 role）
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. xp_rules 表
-- ----------------------------------------------------------------------------
create table if not exists public.xp_rules (
  id text primary key,
  value int not null check (value >= 0),
  description_zh text not null,
  description_en text not null,
  sort_order int not null default 0,
  updated_at bigint not null default (extract(epoch from now()) * 1000)
);

comment on table public.xp_rules is 'Admin-editable XP rules (id, value, descriptions)';

-- RLS
alter table public.xp_rules enable row level security;

drop policy if exists "xp_rules_select_all" on public.xp_rules;
create policy "xp_rules_select_all" on public.xp_rules
  for select using (true);

drop policy if exists "xp_rules_admin_write" on public.xp_rules;
create policy "xp_rules_admin_write" on public.xp_rules
  for insert with check (public.is_admin());

drop policy if exists "xp_rules_admin_update" on public.xp_rules;
create policy "xp_rules_admin_update" on public.xp_rules
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "xp_rules_admin_delete" on public.xp_rules;
create policy "xp_rules_admin_delete" on public.xp_rules
  for delete using (public.is_admin());

-- Seed XP 规则
insert into public.xp_rules (id, value, description_zh, description_en, sort_order) values
  ('learn_word',         10, '学习单词',     'Learn a word',          10),
  ('listen_audio',        8, '听力训练',     'Listen to audio',        20),
  ('review_word',         6, '复习任务',     'Review a word',          30),
  ('practice_challenge',  7, '练习挑战',     'Practice challenge',     40),
  ('word_challenge',     10, '单词挑战',     'Word challenge',         50),
  ('daily_goal',         20, '完成每日目标', 'Complete daily goal',    60),
  ('upload_word',        15, '上传词条',     'Upload a word',          70),
  ('upload_audio',       10, '上传音频',     'Upload audio',           80),
  ('upload_wisdom',      15, '上传智慧语录', 'Upload wisdom quote',    90)
on conflict (id) do update set
  value = excluded.value,
  description_zh = excluded.description_zh,
  description_en = excluded.description_en,
  sort_order = excluded.sort_order,
  updated_at = extract(epoch from now()) * 1000;

-- ----------------------------------------------------------------------------
-- 6. levels 表
-- ----------------------------------------------------------------------------
create table if not exists public.levels (
  level int primary key check (level >= 1),
  min_xp int not null unique check (min_xp >= 0),
  name_zh text not null,
  name_en text not null,
  icon text not null,
  sort_order int not null default 0,
  updated_at bigint not null default (extract(epoch from now()) * 1000)
);

comment on table public.levels is 'Admin-editable level definitions';

-- RLS
alter table public.levels enable row level security;

drop policy if exists "levels_select_all" on public.levels;
create policy "levels_select_all" on public.levels
  for select using (true);

drop policy if exists "levels_admin_write" on public.levels;
create policy "levels_admin_write" on public.levels
  for insert with check (public.is_admin());

drop policy if exists "levels_admin_update" on public.levels;
create policy "levels_admin_update" on public.levels
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "levels_admin_delete" on public.levels;
create policy "levels_admin_delete" on public.levels
  for delete using (public.is_admin());

-- Seed levels
insert into public.levels (level, min_xp, name_zh, name_en, icon, sort_order) values
  (1,    0, '初学者',     'Beginner',     '🌱', 1),
  (2,  100, '学徒',       'Apprentice',   '🌿', 2),
  (3,  300, '熟练者',     'Practitioner', '🌳', 3),
  (4,  600, '学者',       'Scholar',      '📚', 4),
  (5, 1000, '大师',       'Master',       '🏕️', 5)
on conflict (level) do update set
  min_xp = excluded.min_xp,
  name_zh = excluded.name_zh,
  name_en = excluded.name_en,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  updated_at = extract(epoch from now()) * 1000;

-- ============================================================================
-- 完成
-- ============================================================================
