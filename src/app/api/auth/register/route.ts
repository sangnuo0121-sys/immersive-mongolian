/**
 * POST /api/auth/register
 * 邮箱 + 密码 + displayName 注册
 *
 * Body: { email, password, displayName }
 * 200: { success, data: { accessToken, refreshToken, user, profile } }
 *
 * trigger handle_new_user 会自动创建 profile
 */

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/storage/database/supabase-client";
import { maybeBootstrapAdmin } from "@/lib/auth/bootstrap-admin";

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, displayName } = body;
  if (!email || !password) {
    return NextResponse.json({ success: false, error: "Missing email or password" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const client = getClient();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || "" } },
  });
  if (error || !data.user) {
    return NextResponse.json({ success: false, error: error?.message || "Registration failed" }, { status: 400 });
  }

  // 邮箱密码模式下，session 立即可用
  if (data.session) {
    const bootstrap = await maybeBootstrapAdmin(data.user.id, data.user.email ?? "");
    let { data: profile } = await client
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    // 安全网：如果 handle_new_user 触发器未生效，手动创建 profile
    if (!profile) {
      const fallbackName = displayName || data.user.email?.split('@')[0] || '';
      const { data: inserted } = await client
        .from("profiles")
        .insert({
          id: data.user.id,
          email: data.user.email,
          display_name: fallbackName,
          role: 'user',
        })
        .select()
        .single();
      profile = inserted;
    }

    return NextResponse.json({
      success: true,
      data: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        user: { id: data.user.id, email: data.user.email },
        profile,
        bootstrap,
      },
    });
  }

  // 邮箱验证模式：session 还没出来，告诉前端去查邮箱
  return NextResponse.json({
    success: true,
    data: {
      needEmailVerification: true,
      user: { id: data.user.id, email: data.user.email },
    },
  });
}
