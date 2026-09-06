# Supabase 自托管配置指南

## 概述

本项目使用 Supabase 作为后端数据库和存储服务。通过配置，你可以连接自己的 Supabase 项目，实现数据持久化。

---

## 步骤 1：在 Supabase 创建项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 **New Project** 创建新项目
3. 填写项目名称和密码
4. 选择区域（建议选择离你最近的区域）
5. 等待项目创建完成

---

## 步骤 2：获取 API 凭证

1. 进入项目后，点击 **Settings** → **API**
2. 复制以下信息：
   - **Project URL** → 填入 `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → 填入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** secret key → 填入 `SUPABASE_SERVICE_ROLE_KEY`

---

## 步骤 3：创建 Storage Buckets

在 Supabase Dashboard 中：

1. 进入 **Storage** 页面
2. 创建以下两个 buckets：

| Bucket Name | Public | Purpose |
|-------------|--------|---------|
| `word-audio` | ✅ | 存储录音文件 |
| `acknowledgements-images` | ✅ | 存储鸣谢页面图片 |

### 设置 Bucket 权限

Bucket 可以设为 Public 以便读取，但不要给匿名用户开放上传、更新或删除。
完成表结构后执行 `supabase/migrations/0002_secure_content_rls.sql`：普通登录用户只能维护自己上传的文件，管理员可以执行管理操作。

---

## 步骤 4：创建数据库表

在 **SQL Editor** 中执行以下 SQL：

### 1. 创建 words 表（如果不存在）

```sql
CREATE TABLE IF NOT EXISTS public.words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mongolian TEXT NOT NULL,
  pinyin TEXT,
  translation_zh TEXT NOT NULL,
  translation_en TEXT,
  theme TEXT,
  audio_url TEXT,
  category_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  example_mongolian TEXT,
  example_translation_zh TEXT,
  example_translation_en TEXT,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. 创建 categories 表

```sql
CREATE TABLE IF NOT EXISTS public.categories (
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
```

### 3. 创建 wisdom_quotes 表

```sql
CREATE TABLE IF NOT EXISTS public.wisdom_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mongolian TEXT NOT NULL,
  translation_zh TEXT,
  translation_en TEXT,
  author_zh TEXT,
  author_en TEXT,
  is_user_uploaded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 创建 acknowledgements 表

```sql
CREATE TABLE IF NOT EXISTS public.acknowledgements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role_zh TEXT,
  role_en TEXT,
  contribution_zh TEXT,
  contribution_en TEXT,
  message TEXT,
  image_url TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. 创建索引

```sql
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_words_category_sort ON public.words(category_id ASC, sort_order ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_words_theme ON public.words(theme);
```

### 6. 插入固定主题

```sql
INSERT INTO public.categories (slug, name_zh, name_en, emoji, description_zh, description_en, sort_order) VALUES
('basic-conversation', '基本对话', 'Basic Conversation', '💬', '日常问候与基础交流', 'Daily greetings and basic communication', 1),
('food-journey', '美食之旅', 'Food Journey', '🍖', '探索蒙古美食与餐饮词汇', 'Explore Mongolian cuisine and dining vocabulary', 2),
('family-members', '家庭成员', 'Family Members', '👨‍👩‍👧‍👦', '家庭关系与称呼', 'Family relationships and titles', 3),
('number-kingdom', '数字王国', 'Number Kingdom', '🔢', '数字与数量表达', 'Numbers and quantities', 4),
('mongolian-culture', '蒙古文化', 'Mongolian Culture', '🏔️', '传统文化与习俗', 'Traditional culture and customs', 5),
('nature-exploration', '自然探索', 'Nature Exploration', '🌿', '自然环境与地理词汇', 'Nature and geography vocabulary', 6),
('advanced-comprehensive', '进阶综合', 'Advanced Comprehensive', '🎓', '高级词汇与复杂表达', 'Advanced vocabulary and complex expressions', 7)
ON CONFLICT (slug) DO NOTHING;
```

---

## 步骤 5：配置 RLS 策略

### 启用 RLS 并设置策略

```sql
-- 启用 RLS
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wisdom_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY;

-- 不要手工创建 USING (true) 的写入策略。
-- 请在 SQL Editor 中执行：
-- 1. supabase/migrations/0001_auth_profiles_xp_levels.sql
-- 2. supabase/migrations/0002_secure_content_rls.sql
```

---

## 步骤 6：配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# 你的 Supabase 项目 URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# 你的 Supabase Anon Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 你的 Supabase Service Role Key
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

---

## 验证配置

部署后访问以下 API 验证：

```bash
# 检查数据状态
curl https://your-domain.com/api/init

# 检查词库
curl https://your-domain.com/api/corpus
```

---

## 故障排除

### 1. 上传失败

- 检查 Storage bucket 是否设置为 Public
- 检查 RLS 策略是否允许 INSERT

### 2. 读取失败

- 检查 RLS 策略是否允许 SELECT
- 检查网络连接是否正常

### 3. CORS 错误

- Supabase Storage 默认支持 CORS
- 如有问题，检查 Supabase 项目设置

---

## 支持

如有问题，请检查：
1. Supabase Dashboard 的 API 日志
2. 浏览器控制台的错误信息
3. 服务器日志
