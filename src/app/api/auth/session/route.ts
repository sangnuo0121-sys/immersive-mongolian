/**
 * GET /api/auth/session
 * 返回当前 session 的 user + profile
 *
 * Header: x-session: <accessToken>
 * 200: { success, data: { user, profile, isAdmin } }
 * 401: { success: false, error }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const result = await getSession(request);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    success: true,
    data: {
      user: { id: result.user.id, email: result.user.email },
      profile: result.profile,
      isAdmin: result.profile?.role === "admin",
    },
  });
}
