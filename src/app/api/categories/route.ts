import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

// 获取所有主题
export async function GET() {
  try {
    const client = getClient();
    
    if (!client) {
      return NextResponse.json({ success: false, error: 'Database service not available' }, { status: 503 });
    }
    
    // 获取所有分类，按 sort_order 排序
    const { data: categories, error } = await client
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 转换为前端格式
    const themes = (categories || []).map((cat: any) => ({
      id: cat.id,
      slug: cat.slug,
      nameZh: cat.name_zh,
      nameEn: cat.name_en,
      emoji: cat.emoji || '📚',
      descriptionZh: cat.description_zh || '',
      descriptionEn: cat.description_en || '',
      sortOrder: cat.sort_order || 0,
      createdAt: cat.created_at,
    }));

    return NextResponse.json({ success: true, data: themes });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// 创建新主题
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    const body = await request.json();
    const { slug, nameZh, nameEn, emoji, descriptionZh, descriptionEn } = body;

    // 验证必填字段
    if (!slug || !nameZh || !nameEn) {
      return NextResponse.json({ 
        success: false, 
        error: '缺少必填字段：slug, nameZh, nameEn' 
      }, { status: 400 });
    }

    // 验证 slug 格式（只允许小写字母、数字和连字符）
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ 
        success: false, 
        error: '主题标识符只能包含小写字母、数字和连字符' 
      }, { status: 400 });
    }

    // 检查 slug 是否已存在
    const { data: existing } = await client
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        success: false, 
        error: '主题标识符已存在' 
      }, { status: 400 });
    }

    // 获取当前最大 sort_order
    const { data: maxOrder } = await client
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = (maxOrder?.[0]?.sort_order || 0) + 1;

    // 插入新主题
    const { data, error } = await client
      .from('categories')
      .insert({
        slug,
        name_zh: nameZh,
        name_en: nameEn,
        emoji: emoji || '📚',
        description_zh: descriptionZh || '',
        description_en: descriptionEn || '',
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: data.id,
        slug: data.slug,
        nameZh: data.name_zh,
        nameEn: data.name_en,
        emoji: data.emoji,
        descriptionZh: data.description_zh,
        descriptionEn: data.description_en,
        sortOrder: data.sort_order,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// 更新主题
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    const body = await request.json();
    const { id, slug, nameZh, nameEn, emoji, descriptionZh, descriptionEn, sort_order } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少主题 ID' }, { status: 400 });
    }

    // 构建更新对象
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (slug !== undefined) {
      // 验证 slug 格式
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return NextResponse.json({ 
          success: false, 
          error: '主题标识符只能包含小写字母、数字和连字符' 
        }, { status: 400 });
      }
      updates.slug = slug;
    }
    if (nameZh !== undefined) updates.name_zh = nameZh;
    if (nameEn !== undefined) updates.name_en = nameEn;
    if (emoji !== undefined) updates.emoji = emoji;
    if (descriptionZh !== undefined) updates.description_zh = descriptionZh;
    if (descriptionEn !== undefined) updates.description_en = descriptionEn;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    // 更新主题
    const { data, error } = await client
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        id: data.id,
        slug: data.slug,
        nameZh: data.name_zh,
        nameEn: data.name_en,
        emoji: data.emoji,
        descriptionZh: data.description_zh,
        descriptionEn: data.description_en,
        sortOrder: data.sort_order,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// 删除主题
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const migrateTo = searchParams.get('migrateTo'); // 可选：迁移到新主题

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少主题 ID' }, { status: 400 });
    }

    // 检查主题是否存在
    const { data: category } = await client
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (!category) {
      return NextResponse.json({ success: false, error: '主题不存在' }, { status: 404 });
    }

    // 获取该主题的 slug
    const themeSlug = category.slug;

    // 检查是否有词条关联该主题
    const { data: words, error: wordsError } = await client
      .from('words')
      .select('id')
      .eq('theme', themeSlug)
      .limit(1);

    if (wordsError) {
      console.error('Error checking words:', wordsError);
      return NextResponse.json({ success: false, error: wordsError.message }, { status: 500 });
    }

    if (words && words.length > 0) {
      // 有词条关联该主题
      if (migrateTo) {
        // 迁移词条到新主题
        const { error: migrateError } = await client
          .from('words')
          .update({ theme: migrateTo })
          .eq('theme', themeSlug);

        if (migrateError) {
          console.error('Error migrating words:', migrateError);
          return NextResponse.json({ success: false, error: migrateError.message }, { status: 500 });
        }
      } else {
        // 拒绝删除
        return NextResponse.json({ 
          success: false, 
          error: '该主题下有词条，请选择迁移目标主题后再删除',
          hasWords: true,
          wordCount: words.length
        }, { status: 400 });
      }
    }

    // 删除主题
    const { error: deleteError } = await client
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
