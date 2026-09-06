/**
 * 权限收口工具
 *
 * - requireAuth(request)        : 任意已登录用户即可（user / admin 都能过）
 * - requireAdmin(request)       : 仅 admin
 * - requireOwnerOrAdmin(request, ownerUserId) : 创建者是当前 user，或当前是 admin
 *
 * 使用方式（API route 内）：
 *   const auth = await requireAdmin(request);
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
 */

import { getProfileByUserId, getSessionFromRequest } from "./session";
import { getServiceRoleClient } from "@/storage/database/supabase-client";

export type AuthCheck =
  | { ok: true; userId: string; email: string; accessToken: string; role: "user" | "admin" }
  | { ok: false; status: 401 | 403; error: string };

export async function requireAuth(request: Request): Promise<AuthCheck> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { ok: false, status: 401, error: "Unauthorized: missing or invalid x-session header" };
  }
  let profile = await getProfileByUserId(session.user.id);
  if (!profile) {
    // Auto-create profile if trigger failed (defensive)
    const client = getServiceRoleClient();
    const displayName = session.user.email ? session.user.email.split('@')[0] : 'User';
    const { data: newProfile, error: insertError } = await client
      .from('profiles')
      .insert({
        id: session.user.id,
        email: session.user.email ?? '',
        display_name: displayName,
        role: 'user',
      })
      .select('id, display_name, role, created_at')
      .single();
    if (insertError || !newProfile) {
      console.error('[requireAuth] auto-create profile failed:', insertError);
      return { ok: false, status: 401, error: "Unauthorized: profile not found and auto-creation failed" };
    }
    profile = newProfile;
  }
  return {
    ok: true,
    userId: session.user.id,
    email: session.user.email ?? "",
    accessToken: session.accessToken,
    role: profile.role as "user" | "admin",
  };
}

export async function requireAdmin(request: Request): Promise<AuthCheck> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.role !== "admin") {
    return { ok: false, status: 403, error: "Forbidden: admin only" };
  }
  return auth;
}

/**
 * 资源所有者或 admin。ownerUserId 为资源 created_by_user_id。
 * - 资源无 owner（null）→ 仅 admin 可改
 * - 资源 owner 是当前 user → 当前 user 可改
 * - 当前是 admin → 永远可改
 */
export async function requireOwnerOrAdmin(
  request: Request,
  ownerUserId: string | null | undefined,
): Promise<AuthCheck> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;
  if (auth.role === "admin") return auth;
  if (!ownerUserId || ownerUserId !== auth.userId) {
    return { ok: false, status: 403, error: "Forbidden: owner or admin only" };
  }
  return auth;
}
