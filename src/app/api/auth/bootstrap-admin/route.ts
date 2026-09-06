/**
 * POST /api/auth/bootstrap-admin
 * 内部使用：登录成功后客户端自动调用一次。
 * 如果当前用户的 email 匹配 BOOTSTRAP_ADMIN_EMAIL，且 role !== 'admin'，则升级为 admin。
 *
 * Header: x-session: <accessToken>
 * 200: { success, data: { promoted: boolean } }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession, getProfileByUserId } from "@/lib/auth/session";
import { maybeBootstrapAdmin } from "@/lib/auth/bootstrap-admin";

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.ok) {
    return NextResponse.json({ success: false, error: session.error }, { status: session.status });
  }

  const bootstrapResult = await maybeBootstrapAdmin(session.user.id, session.user.email);

  // 如果升级了，返回最新的 profile
  let profile = null;
  if (bootstrapResult.upgraded) {
    profile = await getProfileByUserId(session.user.id);
  }

  return NextResponse.json({ success: true, data: { upgraded: bootstrapResult.upgraded, reason: bootstrapResult.reason, profile } });
}
