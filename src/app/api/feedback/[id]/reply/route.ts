import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, TABLES } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

/**
 * PATCH /api/feedback/[id]/reply
 * 管理员回复反馈（可同时标记为已解决）
 *
 * 鉴权：必须 admin
 * Body: { adminReply: string, markResolved?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required / 反馈 ID 为必填项' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const adminReply = typeof body.adminReply === 'string' ? body.adminReply.trim() : '';
    const markResolved = body.markResolved === true;

    if (!adminReply) {
      return NextResponse.json(
        { error: 'Reply content is required / 请输入回复内容' },
        { status: 400 }
      );
    }

    const client = getServiceRoleClient();
    const now = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      admin_reply: adminReply,
      admin_reply_at: now,
      admin_replied_by: auth.email || 'Admin',
    };
    if (markResolved) {
      updatePayload.status = 'resolved';
      updatePayload.resolved_at = now;
    } else {
      updatePayload.status = 'replied';
    }

    const { data, error } = await client
      .from(TABLES.FEEDBACK)
      .update(updatePayload)
      .eq('id', id)
      .select('id, status, admin_reply, admin_reply_at, admin_replied_by, resolved_at')
      .single();

    if (error) {
      console.error('[Feedback Reply] Update error:', error.message);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Feedback not found. / 反馈不存在。' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to post reply. Please try again. / 回复失败，请稍后再试。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: data,
      message: markResolved
        ? 'Reply posted and feedback resolved. / 已回复并标记为已解决。'
        : 'Reply posted. / 已回复。',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Feedback Reply] Exception:', message);
    return NextResponse.json(
      { error: 'Failed to post reply. Please try again. / 回复失败，请稍后再试。' },
      { status: 500 }
    );
  }
}
