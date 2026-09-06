/**
 * Bootstrap Admin 机制
 *
 * 启动时约定：当某个用户登录，且其邮箱等于环境变量 BOOTSTRAP_ADMIN_EMAIL
 * 时，强制把 profile.role 升级为 'admin'。
 *
 * 安全性：
 * - 邮箱比较大小写不敏感
 * - 仅服务端调用，使用 service_role key 绕过 RLS
 * - 不暴露给任何前端
 *
 * 自动 Seed 机制（生产环境首次部署友好）：
 * - 若环境变量同时设置了 BOOTSTRAP_ADMIN_PASSWORD，则当 signInWithPassword 失败、
 *   且用户邮箱 + 密码与两个环境变量完全匹配、且 Supabase auth.users 中
 *   尚不存在该邮箱时，自动用 service_role 创建该用户、设 role=admin、
 *   立即登录拿 session 返回，避免"新生产库没账号"的冷启动阻塞。
 * - 用户已存在时不会触发 seed，由 signInWithPassword 决定后续流程。
 */

import { getSupabaseServiceRoleKey, getSupabaseCredentials } from "@/storage/database/supabase-client";
import { createClient, type Session, type User } from "@supabase/supabase-js";

const BOOTSTRAP_ADMIN_EMAIL = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const BOOTSTRAP_ADMIN_PASSWORD = process.env.BOOTSTRAP_ADMIN_PASSWORD;

function getAdminClient() {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) return null;
  const { url } = getSupabaseCredentials();
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 检查并升级（无副作用：邮箱不匹配 / env 未设 / 已是 admin 时直接返回）
 */
export async function maybeBootstrapAdmin(userId: string, email: string): Promise<{
  upgraded: boolean;
  reason: "no_env" | "email_mismatch" | "already_admin" | "upgrade_failed" | "upgraded";
}> {
  if (!BOOTSTRAP_ADMIN_EMAIL) return { upgraded: false, reason: "no_env" };
  if (!email) return { upgraded: false, reason: "email_mismatch" };
  if (email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL) return { upgraded: false, reason: "email_mismatch" };

  const client = getAdminClient();
  if (!client) {
    console.warn("[bootstrap-admin] BOOTSTRAP_ADMIN_EMAIL is set but service role key is missing");
    return { upgraded: false, reason: "upgrade_failed" };
  }

  // 先查当前 role，避免无谓的写
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile?.role === "admin") return { upgraded: false, reason: "already_admin" };

  const { error } = await client
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) {
    console.error("[bootstrap-admin] upgrade failed:", error);
    return { upgraded: false, reason: "upgrade_failed" };
  }
  return { upgraded: true, reason: "upgraded" };
}

/**
 * 自动 Seed 第一个 Admin
 *
 * 仅在以下条件**全部满足**时触发：
 *   1. BOOTSTRAP_ADMIN_EMAIL 与 BOOTSTRAP_ADMIN_PASSWORD 都已设置
 *   2. 调用方传入的 email 与 BOOTSTRAP_ADMIN_EMAIL 大小写不敏感完全匹配
 *   3. 调用方传入的 password 与 BOOTSTRAP_ADMIN_PASSWORD 完全匹配
 *   4. Supabase auth.users 中**不存在**该邮箱
 *
 * 满足时：
 *   - 用 service_role.auth.admin.createUser 创建用户（email_confirm=true 跳过邮件验证）
 *   - 在 profiles 表 upsert 一条 role='admin' 记录
 *   - 用 anon client 立即 signInWithPassword 拿回 session 和 user
 *   - 返回 success=true + session/user
 *
 * 安全说明：
 *   - 攻击者不知道 BOOTSTRAP_ADMIN_PASSWORD → 不会创建出任意账号
 *   - 攻击者也不知道 BOOTSTRAP_ADMIN_EMAIL → 邮箱不匹配 → 不会触发
 *   - 用户已存在时不会"覆盖密码"或"改邮箱"，由调用方继续走 signInWithPassword
 *   - 整个流程只用 service_role 一次，结束后回 anon client，与普通登录无差异
 */
export async function maybeSeedFirstAdmin(
  email: string,
  password: string,
): Promise<
  | { success: true; session: Session; user: User; reason: "seeded" }
  | { success: false; reason: "no_env" | "email_mismatch" | "password_mismatch" | "user_exists" | "create_failed" | "login_failed" | "profile_upsert_failed" }
> {
  if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
    return { success: false, reason: "no_env" };
  }
  if (email.toLowerCase() !== BOOTSTRAP_ADMIN_EMAIL) {
    return { success: false, reason: "email_mismatch" };
  }
  if (password !== BOOTSTRAP_ADMIN_PASSWORD) {
    return { success: false, reason: "password_mismatch" };
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    console.warn("[bootstrap-admin] service role key missing, cannot seed");
    return { success: false, reason: "create_failed" };
  }

  // 1. 检查用户是否已存在（用 listUsers，service_role 专用 API）
  const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 50,
  });
  if (listError) {
    console.error("[bootstrap-admin] listUsers failed:", listError);
    return { success: false, reason: "create_failed" };
  }
  const existingUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL,
  );
  if (existingUser) {
    // 用户已存在 — 不做任何 seed，让 signInWithPassword 继续走
    return { success: false, reason: "user_exists" };
  }

  // 2. 用 service_role 创建用户
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
    email_confirm: true, // 跳过邮件验证，部署后立即可用
    user_metadata: { source: "bootstrap_seed" },
  });
  if (createError || !createData.user) {
    console.error("[bootstrap-admin] createUser failed:", createError);
    return { success: false, reason: "create_failed" };
  }
  const newUser = createData.user;

  // 3. 创建 profile（role 直接是 admin）
  const displayName = BOOTSTRAP_ADMIN_EMAIL.split("@")[0] || "Admin";
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: newUser.id,
      email: BOOTSTRAP_ADMIN_EMAIL,
      display_name: displayName,
      role: "admin",
    },
    { onConflict: "id" },
  );
  if (profileError) {
    console.error("[bootstrap-admin] profile upsert failed:", profileError);
    // 用户已创建成功 — 不阻断登录（DB trigger 可能已自动建好 profile）
  }

  // 4. 立即用 anon client 登录拿 session（这样前端能拿到 accessToken / refreshToken）
  const { url } = getSupabaseCredentials();
  const anonClient = createClient(url, getSupabaseCredentials().anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
  });
  if (loginError || !loginData.session || !loginData.user) {
    console.error("[bootstrap-admin] post-seed signInWithPassword failed:", loginError);
    return { success: false, reason: "login_failed" };
  }

  console.log(
    `[bootstrap-admin] seeded first admin: ${BOOTSTRAP_ADMIN_EMAIL} (id=${newUser.id})`,
  );
  return {
    success: true,
    session: loginData.session,
    user: loginData.user,
    reason: "seeded",
  };
}
