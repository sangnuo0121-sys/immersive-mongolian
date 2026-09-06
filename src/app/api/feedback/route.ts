import { NextRequest, NextResponse } from 'next/server';
import { getClient, TABLES } from '@/storage/database/supabase-client';

/**
 * GET /api/feedback
 * 获取公开反馈列表
 * - 默认显示所有 status='open' / status='replied' 的反馈
 * - ?includeResolved=true 显示已解决
 * - 按优先级排序：open → replied → resolved；相同状态按 created_at desc
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') === 'true';

    const client = getClient();
    let query = client
      .from(TABLES.FEEDBACK)
      .select('id, name, identity, feedback_type, message, willing_to_contribute, status, created_at, resolved_at, admin_reply, admin_reply_at, admin_replied_by')
      .order('created_at', { ascending: false });

    if (!includeResolved) {
      query = query.in('status', ['open', 'replied']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Feedback API] GET error:', error.message);
      // 兜底：表不存在 / 字段不存在 → 返回空列表（前端友好降级）
      return NextResponse.json({ feedbacks: [], error: error.message }, { status: 200 });
    }

    // 二次排序：open > replied > resolved
    const priority: Record<string, number> = { open: 0, replied: 1, resolved: 2 };
    const sorted = (data ?? []).slice().sort((a, b) => {
      const pa = priority[a.status] ?? 9;
      const pb = priority[b.status] ?? 9;
      if (pa !== pb) return pa - pb;
      // 同状态按 created_at 倒序
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ feedbacks: sorted });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Feedback API] GET exception:', message);
    return NextResponse.json({ feedbacks: [] }, { status: 200 });
  }
}

/**
 * POST /api/feedback
 * 提交新反馈
 * Body: { name?, identity?, feedback_type, message, willing_to_contribute }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, identity, feedback_type, message, willing_to_contribute } = body;

    // 验证必填字段
    if (!feedback_type || typeof feedback_type !== 'string') {
      return NextResponse.json(
        { error: 'Feedback type is required / 反馈类型为必填项' },
        { status: 400 }
      );
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required / 具体问题或建议为必填项' },
        { status: 400 }
      );
    }

    const client = getClient();
    const { data, error } = await client
      .from(TABLES.FEEDBACK)
      .insert({
        name: name?.trim() || null,
        identity: identity?.trim() || null,
        feedback_type: feedback_type.trim(),
        message: message.trim(),
        willing_to_contribute: willing_to_contribute === true,
        status: 'open',
      })
      .select('id, name, identity, feedback_type, message, willing_to_contribute, status, created_at, resolved_at, admin_reply, admin_reply_at, admin_replied_by')
      .single();

    if (error) {
      console.error('[Feedback API] POST error:', error.message);
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again. / 提交失败，请稍后再试。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Feedback API] POST exception:', message);
    return NextResponse.json(
      { error: 'Failed to submit feedback. Please try again. / 提交失败，请稍后再试。' },
      { status: 500 }
    );
  }
}