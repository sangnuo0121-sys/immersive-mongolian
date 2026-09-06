/**
 * POST /api/auth/refresh
 * 用 refresh_token 换新的 access_token
 *
 * Body: { refreshToken: string }
 * 200: { success, data: { accessToken, refreshToken, user } }
 * 401: { success: false, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  let body: { refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { refreshToken } = body;
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: "Missing refreshToken" }, { status: 400 });
  }

  const client = getClient();

  // 先用 refresh_token 设置 session，再刷新
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { success: false, error: "Refresh token expired or invalid" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    },
  });
}
