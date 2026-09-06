import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    const body = await request.json();
    
    // 支持批量更新
    if (body.updates && Array.isArray(body.updates)) {
      const updates = body.updates;
      
      // 批量更新 sort_order
      const promises = updates.map(async (item: { id: string; sortOrder: number }) => {
        const { error } = await client
          .from('words')
          .update({ 
            sort_order: item.sortOrder,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (error) {
          console.error(`Failed to update word ${item.id}:`, error);
        }
        return !error;
      });
      
      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r);
      
      return NextResponse.json({ 
        success: allSuccess, 
        updated: results.filter(r => r).length 
      });
    }
    
    // 兼容旧版单个词条移动
    const { wordId, direction, theme } = body;

    if (!wordId || !direction || !theme) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: wordId, direction, theme'
      }, { status: 400 });
    }

    // 获取当前词条的 sort_order
    const { data: currentWord, error: fetchError } = await client
      .from('words')
      .select('id, sort_order, theme')
      .eq('id', wordId)
      .single();

    if (fetchError || !currentWord) {
      return NextResponse.json({ 
        success: false, 
        error: 'Word not found' 
      }, { status: 404 });
    }

    const currentOrder = currentWord.sort_order || 0;

    if (direction === 'up') {
      // 上移：找到当前词条前一个（sort_order 较小的）
      const { data: prevWord, error: prevError } = await client
        .from('words')
        .select('id, sort_order')
        .eq('theme', theme)
        .lt('sort_order', currentOrder)
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      if (prevError || !prevWord) {
        return NextResponse.json({ 
          success: false, 
          error: 'Already at the top' 
        }, { status: 400 });
      }

      // 交换两个词条的顺序
      await client.from('words').update({ sort_order: prevWord.sort_order }).eq('id', currentWord.id);
      await client.from('words').update({ sort_order: currentOrder }).eq('id', prevWord.id);

    } else if (direction === 'down') {
      // 下移：找到当前词条后一个（sort_order 较大的）
      const { data: nextWord, error: nextError } = await client
        .from('words')
        .select('id, sort_order')
        .eq('theme', theme)
        .gt('sort_order', currentOrder)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single();

      if (nextError || !nextWord) {
        return NextResponse.json({ 
          success: false, 
          error: 'Already at the bottom' 
        }, { status: 400 });
      }

      // 交换两个词条的顺序
      await client.from('words').update({ sort_order: nextWord.sort_order }).eq('id', currentWord.id);
      await client.from('words').update({ sort_order: currentOrder }).eq('id', nextWord.id);
    }

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
