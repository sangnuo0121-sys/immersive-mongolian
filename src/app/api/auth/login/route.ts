/**
 * POST /api/auth/login
 * 邮箱 + 密码登录
 *
 * Body: { email, password }
 * 200: { success, data: { accessToken, refreshToken, user: { id, email }, profile, seed? } }
 * 401: { success: false, error }
 *
 * 登录成功后，触发 maybeBootstrapAdmin，如果邮箱匹配 BOOTSTRAP_ADMIN_EMAIL 则升级。
 *
 * 自动 Seed 机制（生产环境首次部署友好）：
 *   若 signInWithPassword 失败（账号不存在 / 密码错），调用 maybeSeedFirstAdmin；
 *   邮箱 + 密码与 BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD 完全匹配，
 *   且 auth.users 中尚不存在该邮箱时，自动创建用户 + role=admin + 返回 session。
 *   其他情况（密码错 / 用户已存在 / env 未设）一律返回 401，不暴露"seed 存在"信息。
 */

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/storage/database/supabase-client";
import { maybeBootstrapAdmin, maybeSeedFirstAdmin } from "@/lib/auth/bootstrap-admin";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Missing email or password" }, { status: 400 });
  }

  const client = getClient();
  let authData = await client.auth.signInWithPassword({ email, password });
  let seeded = false;

  // signInWithPassword 失败时，尝试自动 seed 第一个 admin
  if (authData.error || !authData.data.session) {
    const seed = await maybeSeedFirstAdmin(email, password);
    if (seed.success) {
      authData = {
        data: { user: seed.user, session: seed.session },
        error: null,
      } as typeof authData;
      seeded = true;
    } else {
      return NextResponse.json(
        { success: false, error: authData.error?.message || "Login failed" },
        { status: 401 },
      );
    }
  }

  const { data } = authData;
  if (!data.session || !data.user) {
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 401 });
  }

  // 触发 bootstrap admin 检查（升级 role；新 seed 的用户已是 admin，这里是 no-op）
  const bootstrap = await maybeBootstrapAdmin(data.user.id, data.user.email ?? "");

  // 重新读 profile（升级后 role 应该是 'admin'）
  let { data: profile } = await client
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  // Auto-create profile if trigger failed (defensive)
  if (!profile) {
    const displayName = data.user.email ? data.user.email.split('@')[0] : 'User';
    const { data: newProfile } = await client
      .from("profiles")
      .insert({
        id: data.user.id,
        email: data.user.email ?? '',
        display_name: displayName,
        role: 'user',
      })
      .select("*")
      .single();
    profile = newProfile;
  }

  return NextResponse.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
      profile,
      bootstrap,
      seed: seeded ? { firstAdminSeeded: true } : undefined,
    },
  });
}
