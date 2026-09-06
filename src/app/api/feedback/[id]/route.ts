import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient, TABLES } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

/**
 * DELETE /api/feedback/[id]
 * 管理员删除反馈（不可恢复）。
 *
 * 鉴权：必须 admin
 */
export async function DELETE(
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

    const client = getServiceRoleClient();
    const { error } = await client
      .from(TABLES.FEEDBACK)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Feedback Delete] Delete error:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete feedback. Please try again. / 删除失败，请稍后再试。' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted. / 反馈已删除。',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Feedback Delete] Exception:', message);
    return NextResponse.json(
      { error: 'Failed to delete feedback. Please try again. / 删除失败，请稍后再试。' },
      { status: 500 }
    );
  }
}
