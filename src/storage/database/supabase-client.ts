import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

/**
 * 清理 Supabase URL，移除多余的路径后缀
 * 例如：https://xxx.supabase.co/rest/v1/ → https://xxx.supabase.co
 */
function cleanSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '');
}

/**
 * 验证 Supabase URL 格式
 */
function isValidSupabaseUrl(url: string): boolean {
  const cleaned = cleanSupabaseUrl(url);
  // 支持 supabase.co / supabase.com / 火山引擎 supabase2.aidap-global.cn-beijing.volces.com 等
  return /^https:\/\/[a-z0-9.-]+\.(supabase\.(co|com|net|dev)|aidap-global\.[a-z.-]+\.volces\.com)/.test(cleaned);
}

/**
 * 验证 Anon Key 格式（JWT 格式）
 */
function isValidAnonKey(key: string): boolean {
  return /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key);
}

function resolveCredentials(): SupabaseCredentials {
  // 1. 平台提供的 COZE 配置（优先，稳定可靠）
  const cozeUrl = process.env.COZE_SUPABASE_URL;
  const cozeKey = process.env.COZE_SUPABASE_ANON_KEY;

  if (cozeUrl && cozeKey && cozeKey.length > 10) {
    console.log('[Supabase] Using COZE_SUPABASE_* credentials');
    return { url: cleanSupabaseUrl(cozeUrl), anonKey: cozeKey };
  }

  // 2. 用户自定义配置（需严格校验 Key 格式为 JWT）
  const userUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const userKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (userUrl && userKey) {
    const cleanedUrl = cleanSupabaseUrl(userUrl);
    const urlValid = isValidSupabaseUrl(cleanedUrl);
    const keyValid = isValidAnonKey(userKey); // 必须是 eyX.x.y 格式的 JWT
    
    if (urlValid && keyValid) {
      console.log('[Supabase] Using user-provided NEXT_PUBLIC_SUPABASE_* credentials');
      return { url: cleanedUrl, anonKey: userKey };
    }
    
    if (!urlValid) {
      console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_URL format invalid, skipping');
    }
    if (!keyValid) {
      console.warn('[Supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY is not a valid JWT (must start with eyJ), skipping');
    }
  }

  // 3. 旧格式配置
  const legacyUrl = process.env.SUPABASE_URL;
  const legacyKey = process.env.SUPABASE_ANON_KEY;

  if (legacyUrl && legacyKey) {
    const cleanedUrl = cleanSupabaseUrl(legacyUrl);
    const urlValid = isValidSupabaseUrl(cleanedUrl);
    const keyValid = isValidAnonKey(legacyKey);
    
    if (urlValid && keyValid) {
      console.log('[Supabase] Using SUPABASE_* credentials (legacy format)');
      return { url: cleanedUrl, anonKey: legacyKey };
    }
  }

  throw new Error(
    '[Supabase] No valid credentials found. Please configure:\n' +
    '  - COZE_SUPABASE_URL + COZE_SUPABASE_ANON_KEY (platform provided, recommended)\n' +
    '  - NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (JWT format, eyJ...)\n' +
    'in your environment variables.'
  );
}

function getServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY
  );
}

/** 创建新的 Supabase 客户端实例 */
function createSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = resolveCredentials();

  const options = {
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  };

  if (token) {
    return createClient(url, anonKey, {
      ...options,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  // 普通客户端始终使用 anon key。service_role 只能通过
  // getServiceRoleClient() 显式获取，避免未鉴权路由意外绕过 RLS。
  return createClient(url, anonKey, options);
}

/**
 * 获取请求级 Supabase 客户端。
 * 每次创建新实例，避免服务端不同请求之间共享认证状态。
 */
export function getClient(token?: string): SupabaseClient {
  return createSupabaseClient(token);
}

/** 获取使用 Service Role Key 的客户端（绕过 RLS） */
export function getServiceRoleClient(): SupabaseClient {
  const { url } = resolveCredentials();
  const serviceRoleKey = getServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error('[Supabase] SUPABASE_SERVICE_ROLE_KEY is required for this server-only operation');
  }
  return createClient(url, serviceRoleKey, {
    db: { timeout: 60000 },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** 向后兼容别名 */
export const getSupabaseClient = getClient;

/** 获取 Service Role Key */
export const getSupabaseServiceRoleKey = () => getServiceRoleKey() || '';

/** 获取当前凭证 */
export const getSupabaseCredentials = () => {
  const { url, anonKey } = resolveCredentials();
  return { url, anonKey };
};

// 导出分类表常量
export const TABLES = {
  WORDS: 'words',
  WISDOM_QUOTES: 'wisdom_quotes',
  ACKNOWLEDGEMENTS: 'acknowledgements',
  CATEGORIES: 'categories',
  AUDIO_RECORDS: 'audio_records',
  FEEDBACK: 'feedback',
} as const;

// 导出 Storage bucket 常量
export const BUCKETS = {
  WORD_AUDIO: 'word-audio',
  ACKNOWLEDGEMENTS_IMAGES: 'acknowledgements-images',
  CULTURE_ARTICLES_IMAGES: 'culture-articles-images',
  ORAL_ARCHIVES_AUDIO: 'oral-archives-audio',
} as const;
