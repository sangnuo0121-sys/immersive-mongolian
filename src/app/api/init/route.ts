import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database';
import { requireAdmin } from '@/lib/auth/require-auth';

const STORAGE_BUCKETS = [
  { name: 'word-audio', public: true, fileSizeLimit: 10 * 1024 * 1024 },
  { name: 'oral-archives-audio', public: true, fileSizeLimit: 20 * 1024 * 1024 },
];

// 初始化存储桶
async function ensureStorageBuckets(client: NonNullable<ReturnType<typeof getClient>>) {
  const results: { bucket: string; created: boolean; error?: string }[] = [];
  const { data: buckets, error: listError } = await client.storage.listBuckets();
  if (listError) return { success: false, error: `Failed to list buckets: ${listError.message}` };

  for (const bucket of STORAGE_BUCKETS) {
    const exists = buckets?.some(b => b.name === bucket.name);
    if (!exists) {
      const { error: createError } = await client.storage.createBucket(bucket.name, {
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
      });
      results.push({ bucket: bucket.name, created: !createError, error: createError?.message });
    } else {
      results.push({ bucket: bucket.name, created: true });
    }
  }
  return { success: true, results };
}

// 初始化数据库表结构和种子数据
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);

    // 1. 初始化存储桶（oral-archives-audio + word-audio）
    const bucketResults = await ensureStorageBuckets(client);

    // 2. 初始化 site_metrics 表
    const { error: smError } = await client.rpc('exec_sql', {
      query: `CREATE TABLE IF NOT EXISTS site_metrics (id TEXT PRIMARY KEY, total_visitors INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW());
              INSERT INTO site_metrics (id, total_visitors) VALUES ('main', 0) ON CONFLICT (id) DO NOTHING;`
    });
    if (smError) {
      await client.from('site_metrics').upsert({ id: 'main', total_visitors: 0 }, { onConflict: 'id', ignoreDuplicates: true });
    }

    // 3. 插入固定主题
    const categories = [
      { slug: 'basic-conversation', name_zh: '基本对话', name_en: 'Basic Conversation', emoji: '💬', sort_order: 1 },
      { slug: 'food-journey', name_zh: '美食之旅', name_en: 'Food Journey', emoji: '🍖', sort_order: 2 },
      { slug: 'family-members', name_zh: '家庭成员', name_en: 'Family Members', emoji: '👨‍👩‍👧‍👦', sort_order: 3 },
      { slug: 'number-kingdom', name_zh: '数字王国', name_en: 'Number Kingdom', emoji: '🔢', sort_order: 4 },
      { slug: 'mongolian-culture', name_zh: '蒙古文化', name_en: 'Mongolian Culture', emoji: '🏔️', sort_order: 5 },
      { slug: 'nature-exploration', name_zh: '自然探索', name_en: 'Nature Exploration', emoji: '🌿', sort_order: 6 },
      { slug: 'advanced-comprehensive', name_zh: '进阶综合', name_en: 'Advanced Comprehensive', emoji: '🎓', sort_order: 7 },
    ];
    for (const cat of categories) {
      await client.from('categories').upsert(cat, { onConflict: 'slug' });
    }

    const { count: wordCount } = await client.from('words').select('id', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Database initialized',
      categoriesCount: categories.length,
      wordsCount: wordCount || 0,
      buckets: bucketResults,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 获取初始化状态
export async function GET() {
  try {
    const client = getClient();
    if (!client) return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });

    const { count: categoryCount } = await client.from('categories').select('id', { count: 'exact', head: true });
    const { count: wordCount } = await client.from('words').select('id', { count: 'exact', head: true });

    return NextResponse.json({
      categories: categoryCount || 0,
      words: wordCount || 0,
      needsInit: (categoryCount || 0) === 0 || (wordCount || 0) === 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
