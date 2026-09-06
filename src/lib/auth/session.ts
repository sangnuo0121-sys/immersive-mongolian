/**
 * 服务端：从请求头解析 Supabase session
 *
 * 约定：前端在登录后把 Supabase `access_token` 写入
 *       `x-session` 请求头，服务端从这里解析出 user。
 * 约定：若需要刷新 token，前端用 supabase-js 拿到新 token 后
 *       重写请求即可（autoRefreshToken 客户端默认开启）。
 */

import { getClient, getSupabaseServiceRoleKey } from "@/storage/database/supabase-client";
import type { Profile } from "@/types/auth";
import type { User } from "@supabase/supabase-js";

export const SESSION_HEADER = "x-session";
export const SESSION_STORAGE_KEY = "mn-auth-session";

export interface SessionInfo {
  user: User;
  accessToken: string;
}

/**
 * 从 Request 提取并校验 session。失败返回 null（不抛错）。
 * 校验逻辑：调用 supabase.auth.getUser(token) — 失败 / 过期 / 无效 token 都会返回 null。
 */
export async function getSessionFromRequest(
  request: Request,
): Promise<SessionInfo | null> {
  const token = request.headers.get(SESSION_HEADER);
  if (!token) return null;

  try {
    const client = getClient(token);
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return { user: data.user, accessToken: token };
  } catch {
    return null;
  }
}

/**
 * 用 service role 拿 profile（绕过 RLS，用于服务端判断角色）。
 */
export async function getProfileByUserId(userId: string) {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) return null;
  // Create a dedicated admin client using service_role as the API key
  const { createClient } = await import("@supabase/supabase-js");
  const { url } = (await import("@/storage/database/supabase-client")).getSupabaseCredentials();
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("[getProfileByUserId] query error:", error.message, "userId:", userId);
  }
  if (!data) {
    console.warn("[getProfileByUserId] no profile found for userId:", userId);
  }
  return data || null;
}

/**
 * 给 API route 用的统一 session 解析。
 *
 * 返回值是一个"判定结果"包装器：
 *   - 成功：{ ok: true, user, profile, accessToken }
 *   - 失败：{ ok: false, error, status } （401 / 403）
 *
 * - 401：没传 x-session header 或 token 无效
 * - 403：token 有效但 profile 缺失（不该发生，触发即报错）
 */
export type SessionCheckResult =
  | { ok: true; user: { id: string; email: string }; profile: Profile | null; accessToken: string }
  | { ok: false; error: string; status: 401 | 403 };

export async function getSession(
  request: Request,
): Promise<SessionCheckResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { ok: false, error: "Unauthorized: missing or invalid session token", status: 401 };
  }
  const profile = await getProfileByUserId(session.user.id);
  return {
    ok: true,
    user: { id: session.user.id, email: session.user.email ?? "" },
    profile,
    accessToken: session.accessToken,
  };
}
