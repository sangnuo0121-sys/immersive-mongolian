"use client";

/**
 * useAuth - 全局 auth 状态 hook
 *
 * 流程：
 * 1. 启动时从 localStorage 读 access_token + refresh_token → 调 /api/auth/session 拿 profile
 * 2. 若 token 过期 → 自动用 refresh_token 换新 token（无感刷新）
 * 3. 调 setSession() / clearSession() 同步 token
 * 4. isAdmin = profile?.role === 'admin'
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Profile, AuthState } from "@/types/auth";

const ACCESS_TOKEN_KEY = "mongolian-learning-access-token";
const REFRESH_TOKEN_KEY = "mongolian-learning-refresh-token";

interface SessionResponse {
  user: { id: string; email: string | null };
  profile: Profile | null;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  setSession: (accessToken: string, refreshToken?: string, preloaded?: SessionResponse) => Promise<void>;
  clearSession: () => void;
  refresh: () => Promise<void>;
}

let globalAuthListeners: Array<(s: AuthState) => void> = [];
let globalAuthState: AuthState = {
  user: null,
  profile: null,
  isLoggedIn: false,
  isAdmin: false,
  loading: true,
};

// 全局 token 存储（内存 + localStorage 双写）
let globalAccessToken: string | null = null;
let globalRefreshToken: string | null = null;

function persistTokens(accessToken: string, refreshToken?: string) {
  globalAccessToken = accessToken;
  try { localStorage.setItem(ACCESS_TOKEN_KEY, accessToken); } catch {}
  if (refreshToken) {
    globalRefreshToken = refreshToken;
    try { localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken); } catch {}
  }
}

function clearPersistedTokens() {
  globalAccessToken = null;
  globalRefreshToken = null;
  try { localStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
  try { localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {}
}

/** 供非 React 代码（如 AppContext）获取当前 auth token */
export function getAuthToken(): string | null {
  if (globalAccessToken) return globalAccessToken;
  try { return localStorage.getItem(ACCESS_TOKEN_KEY); } catch { return null; }
}

function emit() {
  for (const l of globalAuthListeners) l(globalAuthState);
}

/**
 * 供非 React 代码（如 AppContext）订阅 auth 全局状态变化。
 * 仅在登录/登出/换号时收到派发，不会立即派发（避免 useAuth 还在
 * 异步加载 session 时，订阅方误以为是"已登出"）。
 * @returns 取消订阅函数
 */
export function subscribeAuth(listener: (s: AuthState) => void): () => void {
  globalAuthListeners.push(listener);
  return () => {
    globalAuthListeners = globalAuthListeners.filter(l => l !== listener);
  };
}

async function fetchSession(token: string): Promise<SessionResponse | null> {
  try {
    const res = await fetch("/api/auth/session", {
      headers: { "x-session": token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return json.data as SessionResponse;
  } catch {
    return null;
  }
}

/**
 * 用 refresh_token 换新的 access_token。
 * 成功 → 返回新的 token 对，失败 → 返回 null。
 */
async function tryRefreshToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const rt = globalRefreshToken || (() => { try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; } })();
  if (!rt) return null;

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success) return null;
    return {
      accessToken: json.data.accessToken,
      refreshToken: json.data.refreshToken,
    };
  } catch {
    return null;
  }
}

export function useAuth(): AuthContextValue {
  const [state, setState] = useState<AuthState>(globalAuthState);

  useEffect(() => {
    const listener = (s: AuthState) => setState(s);
    globalAuthListeners.push(listener);

    // 启动时只跑一次
    if (globalAuthState.loading) {
      (async () => {
        let token: string | null = null;
        let rt: string | null = null;
        try {
          token = localStorage.getItem(ACCESS_TOKEN_KEY);
          rt = localStorage.getItem(REFRESH_TOKEN_KEY);
        } catch {}

        if (token) {
          globalAccessToken = token;
          if (rt) globalRefreshToken = rt;

          let data = await fetchSession(token);

          // token 过期 → 尝试用 refresh_token 刷新
          if (!data && rt) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
              persistTokens(refreshed.accessToken, refreshed.refreshToken);
              data = await fetchSession(refreshed.accessToken);
            }
          }

          if (data) {
            globalAuthState = {
              user: data.user,
              profile: data.profile,
              isLoggedIn: true,
              isAdmin: data.isAdmin,
              loading: false,
            };
          } else {
            // 刷新也失败了，彻底登出
            clearPersistedTokens();
            globalAuthState = { ...globalAuthState, loading: false };
          }
        } else {
          globalAuthState = { ...globalAuthState, loading: false };
        }
        emit();
      })();
    }

    return () => {
      globalAuthListeners = globalAuthListeners.filter(l => l !== listener);
    };
  }, []);

  const setSession = useCallback(async (accessToken: string, refreshToken?: string, preloaded?: SessionResponse) => {
    persistTokens(accessToken, refreshToken);

    if (preloaded) {
      // 使用登录/注册 API 直接返回的 profile 数据，不再二次请求
      globalAuthState = {
        user: preloaded.user ?? null,
        profile: preloaded.profile ?? null,
        isLoggedIn: true,
        isAdmin: preloaded.isAdmin || preloaded.profile?.role === "admin",
        loading: false,
      };
      emit();
      return;
    }

    const data = await fetchSession(accessToken);
    globalAuthState = {
      user: data?.user ?? null,
      profile: data?.profile ?? null,
      isLoggedIn: !!data,
      isAdmin: data?.isAdmin ?? false,
      loading: false,
    };
    emit();
  }, []);

  const clearSession = useCallback(() => {
    clearPersistedTokens();
    globalAuthState = {
      user: null, profile: null, isLoggedIn: false, isAdmin: false, loading: false,
    };
    emit();
  }, []);

  const refresh = useCallback(async () => {
    const token: string | null = getAuthToken();
    if (!token) {
      clearSession();
      return;
    }
    let data = await fetchSession(token);

    // token 过期 → 尝试刷新
    if (!data) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        persistTokens(refreshed.accessToken, refreshed.refreshToken);
        data = await fetchSession(refreshed.accessToken);
      }
    }

    globalAuthState = {
      user: data?.user ?? null,
      profile: data?.profile ?? null,
      isLoggedIn: !!data,
      isAdmin: data?.isAdmin ?? false,
      loading: false,
    };
    emit();
  }, [clearSession]);

  return useMemo(() => ({ ...state, setSession, clearSession, refresh }),
    [state, setSession, clearSession, refresh]);
}
