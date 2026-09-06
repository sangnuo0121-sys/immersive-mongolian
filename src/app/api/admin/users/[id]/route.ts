import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getClient, getSupabaseServiceRoleKey, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';
import { maybeBootstrapAdmin } from '@/lib/auth/bootstrap-admin';

// PATCH /api/admin/users/[id]
// Admin 改变 user role (user / admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    if (!session.profile || session.profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }
    await maybeBootstrapAdmin(session.user.id, session.user.email);

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    const body = await request.json();
    const newRole = body?.role;
    if (newRole !== 'user' && newRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'role must be user or admin' }, { status: 400 });
    }

    // 防止 admin 把自己降级
    if (session.user.id === id && newRole === 'user') {
      return NextResponse.json({ success: false, error: '不能把自己降级为普通用户' }, { status: 400 });
    }

    const client = getClient(session.accessToken);
    const { data, error } = await client
      .from('profiles')
      .update({ role: newRole })
      .eq('id', id)
      .select('id, role')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 如果角色从 admin 降为 user，强制该用户重新登录（invalidate session）
    if (newRole === 'user') {
      try {
        const serviceKey = getSupabaseServiceRoleKey();
        if (serviceKey) {
          const { createClient } = await import('@supabase/supabase-js');
          const { url } = (await import('@/storage/database/supabase-client')).getSupabaseCredentials();
          const adminClient = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
          await adminClient.auth.admin.signOut(id);
        }
      } catch (signOutErr) {
        console.warn('[admin/users] failed to sign out demoted user:', signOutErr);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id]
// Admin 删除用户（同时删除 auth.users 和 profiles）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    if (!session.profile || session.profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing user id' }, { status: 400 });
    }

    // 防止 admin 删除自己
    if (session.user.id === id) {
      return NextResponse.json({ success: false, error: '不能删除自己的账号' }, { status: 400 });
    }

    const serviceKey = getSupabaseServiceRoleKey();
    if (!serviceKey) {
      return NextResponse.json({ success: false, error: 'Service role key 未配置，无法删除用户' }, { status: 500 });
    }

    // 使用 service_role key 创建 admin client（绕过 RLS）
    const { createClient } = await import('@supabase/supabase-js');
    const { getSupabaseCredentials } = await import('@/storage/database/supabase-client');
    const { url } = getSupabaseCredentials();
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. 先删除 auth.users（会级联删除 profiles，如果有外键）
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);
    if (authError) {
      return NextResponse.json({ success: false, error: `删除 auth 账号失败: ${authError.message}` }, { status: 500 });
    }

    // 2. 再尝试删除 profiles（如果触发器没级联）
    const client = getClient(session.accessToken);
    const { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', id);

    // 如果是 row not found，忽略；其他错误提示
    if (profileError && !profileError.message?.includes('not found') && profileError.code !== 'PGRST116') {
      console.warn('[admin/users] failed to delete profile (may already be gone):', profileError);
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
