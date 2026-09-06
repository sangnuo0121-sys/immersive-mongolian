import { NextRequest, NextResponse } from 'next/server';
import { getClient, getSupabaseServiceRoleKey, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';
import { maybeBootstrapAdmin } from '@/lib/auth/bootstrap-admin';

// GET /api/admin/users
// Admin only: 列出所有用户（联合 auth.users + profiles）
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    if (!session.profile || session.profile.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
    }
    await maybeBootstrapAdmin(session.user.id, session.user.email);

    // 1. 读取 profiles 表
    const client = getClient(session.accessToken);
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 500 });
    }

    // 2. 用 service_role 读 auth.users 以发现没有 profile 的用户
    const serviceKey = getSupabaseServiceRoleKey();
    if (serviceKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const { url } = getSupabaseCredentials();
      const adminClient = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: authUsers } = await adminClient.auth.admin.listUsers();
      if (authUsers?.users) {
        const profileIds = new Set((profiles || []).map((p: any) => p.id));
        const missingUsers = authUsers.users.filter((u: any) => !profileIds.has(u.id));

        // 自动补建缺失的 profiles
        for (const u of missingUsers) {
          const displayName = u.user_metadata?.display_name || u.email?.split('@')[0] || '';
          await adminClient
            .from('profiles')
            .insert({
              id: u.id,
              email: u.email,
              display_name: displayName,
              role: 'user',
              created_at: u.created_at,
            })
            .select()
            .single();
        }

        // 如果有补建，重新查询 profiles
        if (missingUsers.length > 0) {
          const { data: refreshed } = await client
            .from('profiles')
            .select('id, email, display_name, role, created_at')
            .order('created_at', { ascending: false });
          return NextResponse.json({ success: true, data: refreshed || [] });
        }
      }
    }

    return NextResponse.json({ success: true, data: profiles || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
