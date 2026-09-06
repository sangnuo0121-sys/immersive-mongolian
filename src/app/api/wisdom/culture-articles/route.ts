import { NextRequest, NextResponse } from 'next/server';
import { getClient, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';
import { requireAuth, requireOwnerOrAdmin } from "@/lib/auth/require-auth";
import { syncMongolianDisplayForRecord, markOldSvgAsOutdated } from '@/lib/mongolian-display';
import { CultureArticle } from '@/types';

const BUCKET_NAME = 'culture-articles-images';

// 确保 storage bucket 存在（用上传探针方式探测，避开 listBuckets 的 RLS 限制）
async function ensureBucketExists(client: NonNullable<ReturnType<typeof getClient>>): Promise<boolean> {
  const probeKey = `__probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const probeBody = new Uint8Array([0]);
  try {
    // 1. 尝试直接上传一个 1 字节的探针文件
    const { error: upErr } = await client.storage
      .from(BUCKET_NAME)
      .upload(probeKey, probeBody, { contentType: 'application/octet-stream', upsert: false });
    if (!upErr) {
      // 上传成功：bucket 存在，立刻清理探针
      await client.storage.from(BUCKET_NAME).remove([probeKey]);
      return true;
    }
    const msg = String((upErr as any)?.message || '');
    const status = String((upErr as any)?.statusCode || '');
    if (/bucket .* not found/i.test(msg) || /not.*found/i.test(msg) || status === '404') {
      // 2. bucket 不存在 → 尝试创建
      const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
      });
      if (createError) {
        console.error('Failed to create bucket:', createError);
        return false;
      }
      console.log('Created bucket:', BUCKET_NAME);
      return true;
    }
    // 3. 其它错误（如 RLS/权限）→ 视为 bucket 已存在但当前 key 无写权限
    //    不返回 false，让真正的上传走一遍，由后续的 upload 错误决定
    console.warn('[culture-articles] probe upload error (assumed bucket exists):', msg);
    return true;
  } catch (error) {
    console.error('Error probing bucket:', error);
    return false;
  }
}

// 将数据库中的 image keys 转换为公开 URL
function resolveImageUrls(client: NonNullable<ReturnType<typeof getClient>>, imageKeys: string[] | null): string[] {
  if (!imageKeys || imageKeys.length === 0) return [];
  
  return imageKeys.map((key) => {
    // 如果已经是完整 URL（兼容旧数据），直接返回
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    // 否则视为 storage key，生成公开 URL
    const fileName = key.includes('/') ? key.split('/').pop() || key : key;
    const { data: urlData } = client.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return urlData.publicUrl;
  });
}

// 上传单张图片到 Storage，返回 image key
async function uploadImageToStorage(
  client: NonNullable<ReturnType<typeof getClient>>,
  imageBase64: string,
  imageType: string,
  articleId: string
): Promise<string | null> {
  const bucketReady = await ensureBucketExists(client);
  if (!bucketReady) {
    console.error('Storage bucket not available');
    return null;
  }
  
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const extension = imageType.split('/')[1] || 'jpg';
    const fileName = `${articleId}_${Date.now()}.${extension}`;
    
    const { data: uploadData, error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: imageType,
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return null;
    }
    
    const uploadedKey = uploadData?.path || fileName;
    const fileKey = uploadedKey.includes('/')
      ? uploadedKey.split('/').pop() || uploadedKey
      : uploadedKey;
    
    return fileKey;
  } catch (uploadError) {
    console.error('Image upload error:', uploadError);
    return null;
  }
}

// 转换数据库行为前端格式
function mapRowToArticle(client: NonNullable<ReturnType<typeof getClient>>, row: any): CultureArticle {
  return {
    id: row.id,
    title: {
      mn: row.title_mn || '',
      zh: row.title_zh || '',
      en: row.title_en || '',
    },
    content: {
      mn: row.content_mn || '',
      zh: row.content_zh || '',
      en: row.content_en || '',
    },
    images: resolveImageUrls(client, row.images),
    imageKeys: row.images || [],
    category: row.category,
    authorName: row.author_name,
    isUserUploaded: row.is_user_uploaded,
    createdByUserId: row.created_by_user_id || undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  };
}

// GET - 获取所有文化文章
export async function GET() {
  try {
    const client = getClient();
    
    if (!client) {
      return NextResponse.json({ error: '服务不可用' }, { status: 503 });
    }

    const { data, error } = await client
      .from('culture_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // 兜底：表不存在（首次部署 / 还没跑过 SQL）→ 返回空数组而非 500
      const msg = String((error as any)?.message || '');
      if (
        (error as any)?.code === 'PGRST205' ||
        /relation .* does not exist/i.test(msg) ||
        /table .* does not exist/i.test(msg) ||
        /Could not find the table/i.test(msg)
      ) {
        console.warn(
          '[culture-articles] Table culture_articles not found. ' +
            '请在 Supabase Dashboard 跑一次 SUPABASE_FULL_SETUP.sql 8.2 节以创建该表。当前返回空数组。',
        );
        return NextResponse.json({ success: true, data: [] });
      }
      console.error('获取文化文章失败:', error);
      return NextResponse.json({ error: '获取文化文章失败' }, { status: 500 });
    }

    const articles: CultureArticle[] = (data || []).map((item: any) => mapRowToArticle(client, item));

    return NextResponse.json({ success: true, data: articles });
  } catch (error) {
    console.error('获取文化文章异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST - 创建新文化文章
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const client = getClient(auth.accessToken);
    
    if (!client) {
      return NextResponse.json({ error: '服务不可用' }, { status: 503 });
    }
    
    const formData = await request.formData();
    
    // 提取文本字段
    const titleMn = formData.get('titleMn') as string | null;
    const titleZh = formData.get('titleZh') as string;
    const titleEn = formData.get('titleEn') as string | null;
    const contentMn = formData.get('contentMn') as string | null;
    const contentZh = formData.get('contentZh') as string;
    const contentEn = formData.get('contentEn') as string | null;
    const category = formData.get('category') as string | null;
    const authorName = formData.get('authorName') as string | null;
    const imageBase64 = formData.get('imageBase64') as string | null;
    const imageType = formData.get('imageType') as string | null;
    
    if (!titleZh || !contentZh) {
      return NextResponse.json({ error: '标题和内容为必填项' }, { status: 400 });
    }

    // 处理图片上传
    const imageKeys: string[] = [];
    
    if (imageBase64 && imageType) {
      const tempId = `ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const uploadedKey = await uploadImageToStorage(client, imageBase64, imageType, tempId);
      if (uploadedKey) {
        imageKeys.push(uploadedKey);
      }
    }

    const { data, error } = await client
      .from('culture_articles')
      .insert({
        title_mn: titleMn || null,
        title_zh: titleZh,
        title_en: titleEn || null,
        content_mn: contentMn || null,
        content_zh: contentZh,
        content_en: contentEn || null,
        images: imageKeys,
        category: category || null,
        author_name: authorName || null,
        is_user_uploaded: true,
        created_by_user_id: auth.userId,
        created_by_name: auth.email || 'User',
      })
      .select()
      .single();

    if (error) {
      console.error('创建文化文章失败:', error);
      return NextResponse.json({ error: '创建失败' }, { status: 500 });
    }

    const article = mapRowToArticle(client, data);

    // 同步：新建后立即生成 title + content 的蒙古文 SVG
    try {
      await syncMongolianDisplayForRecord('culture_articles', data.id, {
        title_mn: data.title_mn,
        content_mn: data.content_mn,
      });
    } catch (e) {
      console.warn(
        `[culture-articles POST] sync svg failed for ${data.id}:`,
        e,
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('创建文化文章异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// PUT - 更新文化文章
export async function PUT(request: NextRequest) {
  try {
    let client = getClient();

    if (!client) {
      return NextResponse.json({ error: '服务不可用' }, { status: 503 });
    }

    const formData = await request.formData();

    const id = formData.get('id') as string;

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    // 权限检查
    const { data: existing } = await client.from('culture_articles').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);

    const titleMn = formData.get('titleMn') as string | null;
    const titleZh = formData.get('titleZh') as string | null;
    const titleEn = formData.get('titleEn') as string | null;
    const contentMn = formData.get('contentMn') as string | null;
    const contentZh = formData.get('contentZh') as string | null;
    const contentEn = formData.get('contentEn') as string | null;
    const category = formData.get('category') as string | null;
    const authorName = formData.get('authorName') as string | null;
    const imageBase64 = formData.get('imageBase64') as string | null;
    const imageType = formData.get('imageType') as string | null;
    // 保留已有图片的 key（如果用户没有上传新图片）
    const existingImageKeysRaw = formData.get('existingImageKeys') as string | null;

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (titleMn !== null) updateData.title_mn = titleMn || null;
    if (titleZh !== null) updateData.title_zh = titleZh;
    if (titleEn !== null) updateData.title_en = titleEn || null;
    if (contentMn !== null) updateData.content_mn = contentMn || null;
    if (contentZh !== null) updateData.content_zh = contentZh;
    if (contentEn !== null) updateData.content_en = contentEn || null;
    if (category !== null) updateData.category = category || null;
    if (authorName !== null) updateData.author_name = authorName || null;

    // 处理图片：如果有新上传的图片，替换；否则保留已有的
    if (imageBase64 && imageType) {
      const uploadedKey = await uploadImageToStorage(client, imageBase64, imageType, id);
      if (uploadedKey) {
        updateData.images = [uploadedKey];
      }
    } else if (existingImageKeysRaw !== null) {
      // 前端传来的已有 image keys（JSON 数组字符串）
      try {
        const existingKeys = JSON.parse(existingImageKeysRaw);
        updateData.images = existingKeys;
      } catch {
        updateData.images = [];
      }
    }

    const { data, error } = await client
      .from('culture_articles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新文化文章失败:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    const article = mapRowToArticle(client, data);

    // 同步：title_mn / content_mn 变化时重新生成蒙古文 SVG
    try {
      await syncMongolianDisplayForRecord('culture_articles', article.id, {
        title_mn: data.title_mn,
        content_mn: data.content_mn,
      });
    } catch (e) {
      console.warn(
        `[culture-articles PUT] sync svg failed for ${article.id}:`,
        e,
      );
    }

    return NextResponse.json({ success: true, data: article });
  } catch (error) {
    console.error('更新文化文章异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE - 删除文化文章
export async function DELETE(request: NextRequest) {
  try {
    let client = getClient();

    if (!client) {
      return NextResponse.json({ error: '服务不可用' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    // 权限检查
    const { data: existing } = await client.from('culture_articles').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);

    // 先获取文章以删除 Storage 中的图片
    const { data: article } = await client
      .from('culture_articles')
      .select('images')
      .eq('id', id)
      .single();
    
    if (article?.images && article.images.length > 0) {
      // 删除 Storage 中的图片文件
      const keysToDelete = article.images.filter((key: string) => 
        !key.startsWith('http://') && !key.startsWith('https://')
      );
      
      if (keysToDelete.length > 0) {
        const { error: removeError } = await client.storage
          .from(BUCKET_NAME)
          .remove(keysToDelete);
        
        if (removeError) {
          console.error('Failed to remove images from storage:', removeError);
        }
      }
    }

    // 清除预渲染 SVG 缓存（title 和 content）
    try {
      await markOldSvgAsOutdated('culture_articles', id);
    } catch (e) {
      console.warn(
        `[culture-articles DELETE] markOldSvgAsOutdated failed for ${id}:`,
        e,
      );
    }

    const { error } = await client
      .from('culture_articles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('删除文化文章失败:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除文化文章异常:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
