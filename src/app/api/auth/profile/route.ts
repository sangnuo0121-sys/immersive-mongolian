/**
 * PUT /api/auth/profile
 * 修改当前用户的昵称（profiles.display_name）。
 *
 * 鉴权：x-session header。
 * 约束：2-30 字符，trim 后非空，不含连续空格。
 * 写库：使用 service_role key 直接 UPDATE profiles 表（避免依赖 RLS）。
 *
 * 200: { success, data: { profile } }
 * 400: { success: false, error } — 参数非法
 * 401: { success: false, error } — 未登录 / token 失效
 * 404: { success: false, error } — profile 不存在
 * 500: { success: false, error } — 服务端错误
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getServiceRoleClient } from "@/storage/database/supabase-client";

interface PutBody {
  display_name?: unknown;
}

function validateDisplayName(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "display_name must be a string" };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "昵称不能为空" };
  }
  if (trimmed.length < 2) {
    return { ok: false, error: "昵称至少 2 个字符" };
  }
  if (trimmed.length > 30) {
    return { ok: false, error: "昵称最多 30 个字符" };
  }
  // 禁止连续三个以上空格
  if (/\s{3,}/.test(trimmed)) {
    return { ok: false, error: "昵称不能包含连续 3 个以上空格" };
  }
  // 禁止纯空白 + 标点
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return { ok: false, error: "昵称需要包含至少一个字母或数字" };
  }
  return { ok: true, value: trimmed };
}

export async function PUT(request: NextRequest) {
  // 1) 鉴权
  const session = await getSession(request);
  if (!session.ok) {
    return NextResponse.json({ success: false, error: session.error }, { status: session.status });
  }

  // 2) 解析 + 校验 body
  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体不是合法 JSON" }, { status: 400 });
  }
  const validation = validateDisplayName(body.display_name);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  // 3) 用 service_role 写库（绕过 RLS）
  const serviceClient = getServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ success: false, error: "服务端未配置 service_role key" }, { status: 500 });
  }

  const { data, error } = await serviceClient
    .from("profiles")
    .update({ display_name: validation.value })
    .eq("id", session.user.id)
    .select("id, display_name, role, created_at")
    .single();

  if (error) {
    console.error("[PUT /api/auth/profile] update error:", error.message);
    // PGRST116 = no rows updated
    if (error.code === "PGRST116") {
      return NextResponse.json({ success: false, error: "用户档案不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: false, error: "更新失败，请稍后再试" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ success: false, error: "用户档案不存在" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { profile: data } });
}
