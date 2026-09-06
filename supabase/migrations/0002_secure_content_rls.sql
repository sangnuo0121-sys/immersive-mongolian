-- Restrict content mutations to authenticated owners or administrators.
-- Apply after 0001_auth_profiles_xp_levels.sql and the content schema.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id::text = auth.uid()::text and role = 'admin'
  );
$$;

-- Remove legacy permissive policies before installing the secure set.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'words', 'wisdom_quotes', 'acknowledgements', 'categories',
    'oral_archives', 'culture_articles', 'audio_votes', 'feedback',
    'xp_rules', 'levels', 'announcements'
  ] loop
    if to_regclass('public.' || target_table) is not null then
      execute format('alter table public.%I enable row level security', target_table);
      for existing_policy in
        select policyname from pg_policies
        where schemaname = 'public' and tablename = target_table
      loop
        execute format('drop policy if exists %I on public.%I', existing_policy.policyname, target_table);
      end loop;
    end if;
  end loop;
end;
$$;

-- Public learning content; contributors may change only their own records.
create policy words_public_read on public.words for select using (true);
create policy words_authenticated_insert on public.words for insert to authenticated
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy words_owner_update on public.words for update to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin())
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy words_owner_delete on public.words for delete to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin());

create policy wisdom_public_read on public.wisdom_quotes for select using (true);
create policy wisdom_authenticated_insert on public.wisdom_quotes for insert to authenticated
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy wisdom_owner_update on public.wisdom_quotes for update to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin())
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy wisdom_owner_delete on public.wisdom_quotes for delete to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin());

create policy oral_archives_public_read on public.oral_archives for select using (true);
create policy oral_archives_authenticated_insert on public.oral_archives for insert to authenticated
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy oral_archives_owner_update on public.oral_archives for update to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin())
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy oral_archives_owner_delete on public.oral_archives for delete to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin());

create policy culture_articles_public_read on public.culture_articles for select using (true);
create policy culture_articles_authenticated_insert on public.culture_articles for insert to authenticated
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy culture_articles_owner_update on public.culture_articles for update to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin())
  with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
create policy culture_articles_owner_delete on public.culture_articles for delete to authenticated
  using (created_by_user_id::text = auth.uid()::text or public.is_admin());

-- Administrator-managed content.
create policy acknowledgements_public_read on public.acknowledgements for select using (true);
create policy acknowledgements_admin_write on public.acknowledgements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy categories_public_read on public.categories for select using (true);
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy xp_rules_public_read on public.xp_rules for select using (true);
create policy xp_rules_admin_write on public.xp_rules for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy levels_public_read on public.levels for select using (true);
create policy levels_admin_write on public.levels for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy announcements_public_read on public.announcements for select using (true);
create policy announcements_admin_write on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Voting is private to each signed-in user.
create policy audio_votes_own_read on public.audio_votes for select to authenticated
  using (user_id = auth.uid()::text);
create policy audio_votes_own_insert on public.audio_votes for insert to authenticated
  with check (user_id = auth.uid()::text);
create policy audio_votes_own_update on public.audio_votes for update to authenticated
  using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);
create policy audio_votes_own_delete on public.audio_votes for delete to authenticated
  using (user_id = auth.uid()::text);

-- Feedback stays publicly readable/submittable by product design, but only an
-- administrator may change or remove an existing submission.
create policy feedback_public_read on public.feedback for select using (true);
create policy feedback_public_insert on public.feedback for insert
  with check (
    status = 'open' and resolved_at is null and admin_reply is null and admin_reply_at is null
  );
create policy feedback_admin_update on public.feedback for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy feedback_admin_delete on public.feedback for delete to authenticated
  using (public.is_admin());

-- Tables that may come from the platform schema rather than SUPABASE_FULL_SETUP.sql.
do $$
declare
  existing_policy record;
begin
  if to_regclass('public.audio_records') is not null then
    alter table public.audio_records enable row level security;
    for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'audio_records' loop
      execute format('drop policy if exists %I on public.audio_records', existing_policy.policyname);
    end loop;
    create policy audio_records_public_read on public.audio_records for select using (true);
    create policy audio_records_own_insert on public.audio_records for insert to authenticated
      with check (created_by_user_id::text = auth.uid()::text);
    create policy audio_records_owner_update on public.audio_records for update to authenticated
      using (created_by_user_id::text = auth.uid()::text or public.is_admin())
      with check (created_by_user_id::text = auth.uid()::text or public.is_admin());
    create policy audio_records_owner_delete on public.audio_records for delete to authenticated
      using (created_by_user_id::text = auth.uid()::text or public.is_admin());
  end if;

  if to_regclass('public.word_updates') is not null then
    alter table public.word_updates enable row level security;
    for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'word_updates' loop
      execute format('drop policy if exists %I on public.word_updates', existing_policy.policyname);
    end loop;
    create policy word_updates_public_read on public.word_updates for select using (true);
    create policy word_updates_admin_write on public.word_updates for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.wisdom_updates') is not null then
    alter table public.wisdom_updates enable row level security;
    for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'wisdom_updates' loop
      execute format('drop policy if exists %I on public.wisdom_updates', existing_policy.policyname);
    end loop;
    create policy wisdom_updates_public_read on public.wisdom_updates for select using (true);
    create policy wisdom_updates_admin_write on public.wisdom_updates for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end;
$$;

-- Storage: public reads, signed-in uploads, owner/admin changes.
drop policy if exists "Allow all select on word-audio" on storage.objects;
drop policy if exists "Allow all insert on word-audio" on storage.objects;
drop policy if exists "Allow all update on word-audio" on storage.objects;
drop policy if exists "Allow all delete on word-audio" on storage.objects;
drop policy if exists "Allow all select on acknowledgements-images" on storage.objects;
drop policy if exists "Allow all insert on acknowledgements-images" on storage.objects;
drop policy if exists "Allow all update on acknowledgements-images" on storage.objects;
drop policy if exists "Allow all delete on acknowledgements-images" on storage.objects;
drop policy if exists "Allow all select on culture-articles-images" on storage.objects;
drop policy if exists "Allow all insert on culture-articles-images" on storage.objects;
drop policy if exists "Allow all update on culture-articles-images" on storage.objects;
drop policy if exists "Allow all delete on culture-articles-images" on storage.objects;
drop policy if exists "Allow all select on oral-archives-audio" on storage.objects;
drop policy if exists "Allow all insert on oral-archives-audio" on storage.objects;
drop policy if exists "Allow all update on oral-archives-audio" on storage.objects;
drop policy if exists "Allow all delete on oral-archives-audio" on storage.objects;

create policy learning_storage_public_read on storage.objects for select
  using (bucket_id in ('word-audio', 'acknowledgements-images', 'culture-articles-images', 'oral-archives-audio'));
create policy learning_storage_authenticated_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('word-audio', 'culture-articles-images', 'oral-archives-audio')
    or (bucket_id = 'acknowledgements-images' and public.is_admin())
  );
create policy learning_storage_owner_update on storage.objects for update to authenticated
  using (
    bucket_id in ('word-audio', 'culture-articles-images', 'oral-archives-audio')
    and (owner_id = auth.uid() or public.is_admin())
  )
  with check (
    bucket_id in ('word-audio', 'culture-articles-images', 'oral-archives-audio')
    and (owner_id = auth.uid() or public.is_admin())
  );
create policy learning_storage_owner_delete on storage.objects for delete to authenticated
  using (
    (bucket_id in ('word-audio', 'culture-articles-images', 'oral-archives-audio') and owner_id = auth.uid())
    or (bucket_id in ('word-audio', 'acknowledgements-images', 'culture-articles-images', 'oral-archives-audio') and public.is_admin())
  );
