/**
 * POST /api/auth/logout
 * 注销当前 session（服务端 admin 强制下线用，或者客户端自带 signOut 也行）
 *
 * Body: 无
 * Header: x-session: <accessToken>
 * 200: { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  const session = request.headers.get("x-session");
  if (!session) {
    return NextResponse.json({ success: true });
  }

  const client = getClient(session);
  await client.auth.signOut();
  return NextResponse.json({ success: true });
}
