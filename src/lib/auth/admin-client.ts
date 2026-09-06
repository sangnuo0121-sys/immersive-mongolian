import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdmin: SupabaseClient | null = null;

/**
 * 创建一个绕过 RLS 的 Supabase 管理员客户端（service_role key）
 * 用途：服务端 API 路由中执行特权操作（如更新其他用户的角色）
 */
export function getAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.COZE_SUPABASE_URL ||
    '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY ||
    '';

  if (!url || !serviceKey) {
    throw new Error(
      '[admin-client] Supabase service role credentials missing. Required env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  cachedAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}
