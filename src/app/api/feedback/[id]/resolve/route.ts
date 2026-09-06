import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, TABLES } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

/**
 * PATCH /api/feedback/[id]/resolve
 * 标记反馈为已解决。
 * 鉴权：admin 登录（推荐）；不通过则回退到旧密码兼容（FEEDBACK_RESOLVE_CODE）。
 *
 * Body: { code?: string }  （admin 登录时无需 code；老密码流程需提供）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Feedback ID is required / 反馈 ID 为必填项' },
        { status: 400 }
      );
    }

    // 解析 body（老密码流程需要 code）
    let body: { code?: string } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { code } = body;

    // 鉴权：admin 登录优先，失败回退到旧密码
    const auth = await requireAdmin(request);
    const expectedCode = process.env.FEEDBACK_RESOLVE_CODE;
    const passByCode = !!(code && expectedCode && code === expectedCode);

    if (!auth.ok && !passByCode) {
      return NextResponse.json(
        {
          error:
            auth.error ||
            'Unauthorized. Admin login or maintainer code required. / 需要管理员登录或维护者密码。',
        },
        { status: 401 }
      );
    }

    // 更新状态
    const client = getServiceRoleClient();
    const { data, error } = await client
      .from(TABLES.FEEDBACK)
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status, resolved_at, admin_reply, admin_reply_at, admin_replied_by')
      .single();

    if (error) {
      console.error('[Feedback Resolve] Update error:', error.message);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Feedback not found. / 反馈不存在。' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to resolve feedback. Please try again. / 操作失败，请稍后再试。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: data,
      message: 'Feedback marked as resolved. / 反馈已标记为已解决。',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Feedback Resolve] Exception:', message);
    return NextResponse.json(
      { error: 'Failed to resolve feedback. Please try again. / 操作失败，请稍后再试。' },
      { status: 500 }
    );
  }
}
