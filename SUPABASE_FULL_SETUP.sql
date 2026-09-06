-- ============================================
-- Supabase 数据持久化配置脚本
-- 执行位置：Supabase Dashboard → SQL Editor
-- ============================================

-- RLS 管理员判断。profiles 尚未创建时安全返回 false。
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id::text = auth.uid()::text AND role = 'admin'
  );
END;
$$;

-- ============================================
-- 1. 创建表：words（词条）
-- ============================================
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  pronunciation TEXT,
  example_sentence TEXT,
  audio_url TEXT,
  theme TEXT DEFAULT 'basic-conversation',
  category_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 创建表：wisdom_quotes（智慧语录）
-- ============================================
CREATE TABLE IF NOT EXISTS wisdom_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  author TEXT DEFAULT 'Unknown',
  source_text TEXT,
  audio_url TEXT,
  image_url TEXT,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 创建表：acknowledgements（鸣谢）
-- ============================================
CREATE TABLE IF NOT EXISTS acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mongolian_name TEXT,
  chinese_name TEXT,
  english_name TEXT,
  contribution TEXT,
  message TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 创建表：categories（分类）
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name_zh VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  emoji VARCHAR(20) NOT NULL,
  description_zh TEXT,
  description_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_words_category_sort ON words(category_id ASC, sort_order ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_words_theme ON words(theme);
CREATE INDEX IF NOT EXISTS idx_wisdom_quotes_created ON wisdom_quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_acknowledgements_created ON acknowledgements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order ASC);

-- ============================================
-- 6. 启用 RLS（行级安全策略）
-- ============================================

-- words 表
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on words" ON words;
DROP POLICY IF EXISTS "Allow all insert on words" ON words;
DROP POLICY IF EXISTS "Allow all update on words" ON words;
DROP POLICY IF EXISTS "Allow all delete on words" ON words;

CREATE POLICY "Allow all select on words" ON words FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on words" ON words FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner update on words" ON words FOR UPDATE TO authenticated
  USING (created_by_user_id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner delete on words" ON words FOR DELETE TO authenticated
  USING (created_by_user_id::text = auth.uid()::text OR public.is_admin());

-- wisdom_quotes 表
ALTER TABLE wisdom_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on wisdom_quotes" ON wisdom_quotes;
DROP POLICY IF EXISTS "Allow all insert on wisdom_quotes" ON wisdom_quotes;
DROP POLICY IF EXISTS "Allow all update on wisdom_quotes" ON wisdom_quotes;
DROP POLICY IF EXISTS "Allow all delete on wisdom_quotes" ON wisdom_quotes;

CREATE POLICY "Allow all select on wisdom_quotes" ON wisdom_quotes FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on wisdom_quotes" ON wisdom_quotes FOR INSERT TO authenticated
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner update on wisdom_quotes" ON wisdom_quotes FOR UPDATE TO authenticated
  USING (created_by_user_id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner delete on wisdom_quotes" ON wisdom_quotes FOR DELETE TO authenticated
  USING (created_by_user_id::text = auth.uid()::text OR public.is_admin());

-- acknowledgements 表
ALTER TABLE acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on acknowledgements" ON acknowledgements;
DROP POLICY IF EXISTS "Allow all insert on acknowledgements" ON acknowledgements;
DROP POLICY IF EXISTS "Allow all update on acknowledgements" ON acknowledgements;
DROP POLICY IF EXISTS "Allow all delete on acknowledgements" ON acknowledgements;

CREATE POLICY "Allow all select on acknowledgements" ON acknowledgements FOR SELECT USING (true);
CREATE POLICY "Allow admin insert on acknowledgements" ON acknowledgements FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update on acknowledgements" ON acknowledgements FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete on acknowledgements" ON acknowledgements FOR DELETE TO authenticated USING (public.is_admin());

-- categories 表
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on categories" ON categories;
DROP POLICY IF EXISTS "Allow all insert on categories" ON categories;
DROP POLICY IF EXISTS "Allow all update on categories" ON categories;

CREATE POLICY "Allow all select on categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow admin insert on categories" ON categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin update on categories" ON categories FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete on categories" ON categories FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================
-- 7. Storage Buckets
-- ============================================

-- 插入 Storage buckets（使用 service role 执行）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('word-audio', 'word-audio', true, 10485760, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('acknowledgements-images', 'acknowledgements-images', true, 5242880, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. Storage Policies（音频文件）
-- ============================================

-- word-audio bucket policies
DROP POLICY IF EXISTS "Allow all select on word-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on word-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on word-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on word-audio" ON storage.objects;

CREATE POLICY "Allow all select on word-audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'word-audio');

CREATE POLICY "Allow authenticated insert on word-audio" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'word-audio');

CREATE POLICY "Allow owner update on word-audio" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'word-audio' AND (owner_id = auth.uid() OR public.is_admin()));

CREATE POLICY "Allow owner delete on word-audio" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'word-audio' AND (owner_id = auth.uid() OR public.is_admin()));

-- acknowledgements-images bucket policies
DROP POLICY IF EXISTS "Allow all select on acknowledgements-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on acknowledgements-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on acknowledgements-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on acknowledgements-images" ON storage.objects;

CREATE POLICY "Allow all select on acknowledgements-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'acknowledgements-images');

CREATE POLICY "Allow admin insert on acknowledgements-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'acknowledgements-images' AND public.is_admin());

CREATE POLICY "Allow admin update on acknowledgements-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'acknowledgements-images' AND public.is_admin());

CREATE POLICY "Allow admin delete on acknowledgements-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'acknowledgements-images' AND public.is_admin());

-- ============================================
-- 8.2 声音档案 (oral_archives) + 文化文典 (culture_articles)
--     用于「文化中心」Tab 跨设备同步上传的内容
-- ============================================

-- 8.2.1 oral_archives 声音档案表
CREATE TABLE IF NOT EXISTS oral_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_mn TEXT,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  description_mn TEXT,
  description_zh TEXT,
  description_en TEXT,
  audio_url TEXT,
  audio_key TEXT,
  duration_seconds INTEGER,
  uploader_name TEXT,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oral_archives_created
  ON oral_archives(created_at DESC);

ALTER TABLE oral_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on oral_archives" ON oral_archives;
DROP POLICY IF EXISTS "Allow all insert on oral_archives" ON oral_archives;
DROP POLICY IF EXISTS "Allow all update on oral_archives" ON oral_archives;
DROP POLICY IF EXISTS "Allow all delete on oral_archives" ON oral_archives;

CREATE POLICY "Allow all select on oral_archives" ON oral_archives
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on oral_archives" ON oral_archives
  FOR INSERT TO authenticated WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner update on oral_archives" ON oral_archives
  FOR UPDATE TO authenticated USING (created_by_user_id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner delete on oral_archives" ON oral_archives
  FOR DELETE TO authenticated USING (created_by_user_id::text = auth.uid()::text OR public.is_admin());

-- 8.2.2 culture_articles 文化文典表
CREATE TABLE IF NOT EXISTS culture_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_mn TEXT,
  title_zh TEXT NOT NULL,
  title_en TEXT,
  content_mn TEXT,
  content_zh TEXT NOT NULL,
  content_en TEXT,
  images TEXT[] DEFAULT '{}',
  category VARCHAR(50),
  author_name TEXT,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_by_user_id UUID,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_culture_articles_created
  ON culture_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_culture_articles_category
  ON culture_articles(category);

ALTER TABLE culture_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select on culture_articles" ON culture_articles;
DROP POLICY IF EXISTS "Allow all insert on culture_articles" ON culture_articles;
DROP POLICY IF EXISTS "Allow all update on culture_articles" ON culture_articles;
DROP POLICY IF EXISTS "Allow all delete on culture_articles" ON culture_articles;

CREATE POLICY "Allow all select on culture_articles" ON culture_articles
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert on culture_articles" ON culture_articles
  FOR INSERT TO authenticated WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner update on culture_articles" ON culture_articles
  FOR UPDATE TO authenticated USING (created_by_user_id::text = auth.uid()::text OR public.is_admin())
  WITH CHECK (created_by_user_id::text = auth.uid()::text OR public.is_admin());
CREATE POLICY "Allow owner delete on culture_articles" ON culture_articles
  FOR DELETE TO authenticated USING (created_by_user_id::text = auth.uid()::text OR public.is_admin());

-- 8.2.3 culture-articles-images storage.objects 策略
DROP POLICY IF EXISTS "Allow all select on culture-articles-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on culture-articles-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on culture-articles-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on culture-articles-images" ON storage.objects;

CREATE POLICY "Allow all select on culture-articles-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'culture-articles-images');
CREATE POLICY "Allow authenticated insert on culture-articles-images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'culture-articles-images');
CREATE POLICY "Allow owner update on culture-articles-images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'culture-articles-images' AND (owner_id = auth.uid() OR public.is_admin()));
CREATE POLICY "Allow owner delete on culture-articles-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'culture-articles-images' AND (owner_id = auth.uid() OR public.is_admin()));

-- 8.2.4 oral-archives-audio storage.objects 策略
DROP POLICY IF EXISTS "Allow all select on oral-archives-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all insert on oral-archives-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all update on oral-archives-audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow all delete on oral-archives-audio" ON storage.objects;

CREATE POLICY "Allow all select on oral-archives-audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'oral-archives-audio');
CREATE POLICY "Allow authenticated insert on oral-archives-audio" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'oral-archives-audio');
CREATE POLICY "Allow owner update on oral-archives-audio" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'oral-archives-audio' AND (owner_id = auth.uid() OR public.is_admin()));
CREATE POLICY "Allow owner delete on oral-archives-audio" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'oral-archives-audio' AND (owner_id = auth.uid() OR public.is_admin()));

-- ============================================
-- 8.3 audio_records 标签系统（官方发音 / 社区发音）
-- ============================================
-- 给已有 audio_records 表加 3 列（老记录默认 community）
ALTER TABLE audio_records
  ADD COLUMN IF NOT EXISTS label VARCHAR(20) NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS upvotes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downvotes INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_audio_records_label ON audio_records(label);

-- 投票表（一用户对一条音频只能投一次）
CREATE TABLE IF NOT EXISTS audio_votes (
  user_id VARCHAR(36) NOT NULL,
  audio_id VARCHAR(36) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, audio_id)
);

CREATE INDEX IF NOT EXISTS idx_audio_votes_audio_id ON audio_votes(audio_id);

ALTER TABLE audio_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audio_votes 允许公开读取" ON audio_votes;
DROP POLICY IF EXISTS "audio_votes 登录用户可写入" ON audio_votes;
DROP POLICY IF EXISTS "audio_votes 登录用户可更新" ON audio_votes;
DROP POLICY IF EXISTS "audio_votes 登录用户可删除" ON audio_votes;
CREATE POLICY "audio_votes 允许公开读取" ON audio_votes FOR SELECT USING (true);
CREATE POLICY "audio_votes 登录用户可写入" ON audio_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "audio_votes 登录用户可更新" ON audio_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "audio_votes 登录用户可删除" ON audio_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

-- ============================================
-- 9. 插入初始分类数据
-- ============================================
INSERT INTO categories (slug, name_zh, name_en, emoji, sort_order) VALUES
('basic-conversation', '基本对话', 'Basic Conversation', '💬', 1),
('food-journey', '美食之旅', 'Food Journey', '🍖', 2),
('family-members', '家庭成员', 'Family Members', '👨‍👩‍👧‍👦', 3),
('number-kingdom', '数字王国', 'Number Kingdom', '🔢', 4),
('mongolian-culture', '蒙古文化', 'Mongolian Culture', '🏔️', 5),
('nature-exploration', '自然探索', 'Nature Exploration', '🌿', 6),
('advanced-comprehensive', '进阶综合', 'Advanced Comprehensive', '🎓', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 10. 验证结果
-- ============================================
SELECT 'Tables created:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

SELECT 'Buckets created:' as status;
SELECT id, name, public FROM storage.buckets;

SELECT 'Categories inserted:' as status;
SELECT slug, name_zh, sort_order FROM categories ORDER BY sort_order;

SELECT 'Oral archives count:' as status;
SELECT COUNT(*) AS oral_archives_count FROM oral_archives;

SELECT 'Culture articles count:' as status;
SELECT COUNT(*) AS culture_articles_count FROM culture_articles;

-- 验证标签 / 投票系统
SELECT 'Audio records labels:' as status;
SELECT
  COUNT(*) FILTER (WHERE label = 'official') AS official_count,
  COUNT(*) FILTER (WHERE label = 'community') AS community_count,
  COALESCE(SUM(upvotes), 0) AS total_upvotes,
  COALESCE(SUM(downvotes), 0) AS total_downvotes
FROM audio_records;

SELECT 'Audio votes count:' as status;
SELECT COUNT(*) AS total_votes FROM audio_votes;

-- ===========================================================
-- 9. feedback 表（用户反馈 + 管理员回复）
-- ===========================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  identity TEXT,
  feedback_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  willing_to_contribute BOOLEAN DEFAULT false NOT NULL,
  status VARCHAR(20) DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'replied', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ,
  admin_reply TEXT,
  admin_reply_at TIMESTAMPTZ,
  admin_replied_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback(status);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all select on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow all insert on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow all update on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow all delete on feedback" ON feedback;
CREATE POLICY "Allow all select on feedback" ON feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert on feedback" ON feedback FOR INSERT
  WITH CHECK (status = 'open' AND resolved_at IS NULL AND admin_reply IS NULL AND admin_reply_at IS NULL);
CREATE POLICY "Allow admin update on feedback" ON feedback FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete on feedback" ON feedback FOR DELETE TO authenticated
  USING (public.is_admin());

-- ===========================================================
-- 10. feedback 表 admin reply 扩展（兼容老库）
-- ===========================================================
-- 兼容老库：如果 feedback 表已存在但缺少 admin_reply 列 → 自动加
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_reply_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS admin_replied_by VARCHAR(100);

-- status 状态机扩展：'open' (待回复) / 'replied' (已回复未解决) / 'resolved' (已解决)
-- 老数据兼容：'open' / 'resolved' 保留，新增 'replied'
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('open', 'replied', 'resolved'));

CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback(status);
CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON feedback(created_at DESC);

-- 验证
SELECT 'Feedback admin reply status:' as status;
SELECT
  COUNT(*) AS total_feedback,
  COUNT(*) FILTER (WHERE status = 'open') AS open_count,
  COUNT(*) FILTER (WHERE status = 'replied') AS replied_count,
  COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
  COUNT(*) FILTER (WHERE admin_reply IS NOT NULL) AS with_reply_count
FROM feedback;

-- ===========================================================
-- 11. xp_rules 表（XP 经验值规则 - 管理员后台可编辑）
-- ===========================================================
CREATE TABLE IF NOT EXISTS xp_rules (
  id VARCHAR(50) PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  description_zh TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

-- 初始 XP 规则（与 src/types/index.ts XP_RULES 一致）
INSERT INTO xp_rules (id, value, description_zh, description_en, sort_order, updated_at) VALUES
  ('learn_word',        10, '学习单词',       'Learn a word',         10, 0),
  ('listen_audio',       8, '听力训练',       'Listen to audio',      20, 0),
  ('review_word',        6, '复习任务',       'Review a word',        30, 0),
  ('practice_challenge', 7, '练习挑战',       'Practice challenge',   40, 0),
  ('word_challenge',    10, '单词挑战',       'Word challenge',       50, 0),
  ('daily_goal',        20, '完成每日目标',   'Complete daily goal',  60, 0),
  ('upload_word',       15, '上传词条',       'Upload a word',        70, 0),
  ('upload_audio',      10, '上传音频',       'Upload audio',         80, 0),
  ('upload_wisdom',     15, '上传智慧语录',   'Upload wisdom quote',  90, 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE xp_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS xp_rules_allow_select ON xp_rules;
DROP POLICY IF EXISTS xp_rules_allow_insert ON xp_rules;
DROP POLICY IF EXISTS xp_rules_allow_update ON xp_rules;
DROP POLICY IF EXISTS xp_rules_allow_delete ON xp_rules;
CREATE POLICY xp_rules_allow_select ON xp_rules FOR SELECT TO public USING (true);
CREATE POLICY xp_rules_allow_insert ON xp_rules FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY xp_rules_allow_update ON xp_rules FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY xp_rules_allow_delete ON xp_rules FOR DELETE TO authenticated USING (public.is_admin());

-- ===========================================================
-- 12. levels 表（等级系统 - 管理员后台可编辑）
-- ===========================================================
CREATE TABLE IF NOT EXISTS levels (
  level INTEGER PRIMARY KEY,
  min_xp INTEGER NOT NULL DEFAULT 0,
  name_zh TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  icon TEXT DEFAULT '⭐',
  sort_order INTEGER DEFAULT 0,
  updated_at BIGINT DEFAULT 0
);

-- 初始等级数据（与 src/types/index.ts LEVEL_TITLES 一致）
INSERT INTO levels (level, min_xp, name_zh, name_en, icon, sort_order, updated_at) VALUES
  (1,    0, '草原之子',       'Steppe Child',            '🌱',  1, 0),
  (2,  100, '牧学者',         'Herd Learner',            '🐑',  2, 0),
  (3,  250, '草原言者',       'Grassland Speaker',       '🌾',  3, 0),
  (4,  500, '游牧探索者',     'Nomadic Explorer',        '🏕️',  4, 0),
  (5,  900, '熟练牧人',       'Skilled Herder',          '🐎',  5, 0),
  (6, 1500, '部族之声',       'Clan Voice',              '🎵',  6, 0),
  (7, 2400, '草原引路人',     'Steppe Guide',            '🧭',  7, 0),
  (8, 3700, '智慧守护者',     'Wisdom Keeper',           '💫',  8, 0),
  (9, 5500, '草原之魂',       'Spirit of the Steppe',    '✨',  9, 0)
ON CONFLICT (level) DO NOTHING;

ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS levels_allow_select ON levels;
DROP POLICY IF EXISTS levels_allow_insert ON levels;
DROP POLICY IF EXISTS levels_allow_update ON levels;
DROP POLICY IF EXISTS levels_allow_delete ON levels;
CREATE POLICY levels_allow_select ON levels FOR SELECT TO public USING (true);
CREATE POLICY levels_allow_insert ON levels FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY levels_allow_update ON levels FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY levels_allow_delete ON levels FOR DELETE TO authenticated USING (public.is_admin());

-- 验证
SELECT 'XP rules & levels:' as status;
SELECT COUNT(*) AS xp_rules_count FROM xp_rules;
SELECT COUNT(*) AS levels_count FROM levels;

-- =====================================================
-- 9. 公告系统 (Announcements)
-- =====================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','update')),
  priority integer NOT NULL DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_published 
  ON announcements(published_at DESC) WHERE published_at IS NOT NULL;

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_allow_select ON announcements;
DROP POLICY IF EXISTS announcements_allow_insert ON announcements;
DROP POLICY IF EXISTS announcements_allow_update ON announcements;
DROP POLICY IF EXISTS announcements_allow_delete ON announcements;

CREATE POLICY announcements_allow_select ON announcements
  FOR SELECT TO public USING (true);
CREATE POLICY announcements_allow_insert ON announcements
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY announcements_allow_update ON announcements
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY announcements_allow_delete ON announcements
  FOR DELETE TO authenticated USING (public.is_admin());

-- ============================================================
-- 10. auth.users 触发器：自动创建 profiles
-- ============================================================

-- 触发器函数：新用户注册时自动在 profiles 表创建记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_display_name text;
BEGIN
  v_display_name := NULLIF(NEW.raw_user_meta_data->>'display_name', '');
  IF v_display_name IS NULL THEN
    v_display_name := split_part(NEW.email, '@', 1);
  END IF;
  INSERT INTO public.profiles (id, email, display_name, role, created_at)
  VALUES (
    NEW.id::text,
    NEW.email,
    v_display_name,
    'user',
    now()
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 挂载触发器到 auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
