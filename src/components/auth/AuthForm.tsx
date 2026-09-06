"use client";

/**
 * 通用登录页 UI 组件（被 /login 和 /register 共用）
 * 遵循 supabase-auth skill 规范：中央卡片、毛玻璃、中英双语
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthFormProps {
  mode: "login" | "register";
}

/**
 * 将 Supabase / 后端返回的英文 error message 映射为中英双语展示
 */
function mapError(raw: string, lang: "zh" | "en"): string {
  const lower = raw.toLowerCase();
  const mappings: Array<{ keywords: string[]; zh: string; en: string }> = [
    { keywords: ["invalid login credentials", "wrong email or password"], zh: "邮箱或密码错误", en: "Wrong email or password" },
    { keywords: ["email already registered", "user already registered", "already been registered", "already exists"], zh: "该邮箱已注册", en: "This email is already registered" },
    { keywords: ["password must be at least", "password too short", "password should be"], zh: "密码至少需要6位字符", en: "Password must be at least 6 characters" },
    { keywords: ["missing email or password"], zh: "请输入邮箱和密码", en: "Please enter email and password" },
    { keywords: ["invalid json"], zh: "请求格式错误", en: "Invalid request format" },
    { keywords: ["network", "fetch", "failed to fetch"], zh: "网络错误，请稍后重试", en: "Network error, please try again" },
    { keywords: ["email not confirmed", "confirm your email"], zh: "请先验证邮箱后再登录", en: "Please confirm your email before signing in" },
    { keywords: ["too many requests", "rate limit"], zh: "请求过于频繁，请稍后再试", en: "Too many requests, please try again later" },
    { keywords: ["signup is disabled"], zh: "当前不允许注册", en: "Sign up is currently disabled" },
  ];

  for (const m of mappings) {
    if (m.keywords.some(k => lower.includes(k))) {
      return lang === "zh" ? `${m.zh} / ${m.en}` : `${m.en} / ${m.zh}`;
    }
  }
  // 未匹配的原始错误，拼上中文前缀
  return lang === "zh" ? `操作失败 / ${raw}` : `Operation failed / ${raw}`;
}

const COPY = {
  zh: {
    loginTitle: "登录",
    registerTitle: "注册",
    emailLabel: "邮箱",
    passwordLabel: "密码",
    displayNameLabel: "昵称",
    loginButton: "登录",
    registerButton: "注册",
    switchToRegister: "没有账号？立即注册",
    switchToLogin: "已有账号？立即登录",
    loginFailed: "登录失败：邮箱或密码错误 / Sign in failed: wrong email or password",
    registerFailed: "注册失败：邮箱可能已被使用或密码强度不足 / Sign up failed: email may be in use or password too weak",
    networkError: "网络错误，请稍后重试 / Network error, please try again",
    loggingIn: "登录中…",
    registering: "注册中…",
  },
  en: {
    loginTitle: "Sign In",
    registerTitle: "Sign Up",
    emailLabel: "Email",
    passwordLabel: "Password",
    displayNameLabel: "Display Name",
    loginButton: "Sign In",
    registerButton: "Sign Up",
    switchToRegister: "Don't have an account? Sign up",
    switchToLogin: "Already have an account? Sign in",
    loginFailed: "Sign in failed: wrong email or password / 登录失败：邮箱或密码错误",
    registerFailed: "Sign up failed: email may be in use or password too weak / 注册失败：邮箱可能已被使用或密码强度不足",
    networkError: "Network error, please try again / 网络错误，请稍后重试",
    loggingIn: "Signing in…",
    registering: "Creating account…",
  },
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"zh" | "en">("zh");
  const t = COPY[language];

  useEffect(() => {
    const langParam = params.get("lang");
    if (langParam === "en" || langParam === "zh") setLanguage(langParam);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && displayName) body.displayName = displayName;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const rawError = json.error || (mode === "login" ? t.loginFailed : t.registerFailed);
        // 如果 rawError 已经是双语格式（包含 " / "），直接用；否则走 mapError
        setError(rawError.includes(" / ") ? rawError : mapError(rawError, language));
        return;
      }

      // 写 session 到 client storage + global state
      const accessToken: string = json.data.accessToken;
      const refreshToken: string | undefined = json.data.refreshToken;
      const profile = json.data.profile ?? null;
      const preloaded = {
        user: json.data.user ?? null,
        profile,
        isAdmin: profile?.role === "admin",
      };

      // 触发 bootstrap admin 检查（登录 API 内部已调用，这里补调一次确保最新）
      try {
        const bootstrapRes = await fetch("/api/auth/bootstrap-admin", {
          method: "POST",
          headers: { "x-session": accessToken },
        });
        const bootstrapJson = await bootstrapRes.json();
        // 如果 bootstrap 升级了角色，用最新 profile
        if (bootstrapJson.success && bootstrapJson.data?.upgraded && bootstrapJson.data?.profile) {
          preloaded.profile = bootstrapJson.data.profile;
          preloaded.isAdmin = bootstrapJson.data.profile.role === "admin";
        }
      } catch {}

      await setSession(accessToken, refreshToken, preloaded);

      const next = params.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-50 via-stone-100 to-orange-50">
      <div className="w-full max-w-md backdrop-blur-md bg-white/80 border border-stone-200 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
            {mode === "login" ? t.loginTitle : t.registerTitle}
          </h1>
          <div className="flex gap-1 text-xs bg-stone-100/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setLanguage("zh")}
              className={`px-2.5 py-1 rounded-md transition-colors ${language === "zh" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >中文</button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-2.5 py-1 rounded-md transition-colors ${language === "en" ? "bg-white text-stone-800 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
            >EN</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-semibold text-stone-700">
                {t.displayNameLabel}
              </Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
                placeholder={language === "zh" ? "选填" : "Optional"}
                className="h-11 px-3 text-base bg-white"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-stone-700">
              {t.emailLabel}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              placeholder={language === "zh" ? "you@example.com" : "you@example.com"}
              required
              className="h-11 px-3 text-base bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-stone-700">
              {t.passwordLabel}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              minLength={6}
              required
              className="h-11 px-3 text-base bg-white"
            />
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            {submitting
              ? (mode === "login" ? t.loggingIn : t.registering)
              : (mode === "login" ? t.loginButton : t.registerButton)}
          </Button>
        </form>

        <div className="text-center text-sm text-stone-600 pt-2">
          {mode === "login" ? (
            <Link href={`/register${params.toString() ? `?${params.toString()}` : ""}`} className="text-amber-700 hover:text-amber-800 font-medium hover:underline transition-colors">
              {t.switchToRegister}
            </Link>
          ) : (
            <Link href={`/login${params.toString() ? `?${params.toString()}` : ""}`} className="text-amber-700 hover:text-amber-800 font-medium hover:underline transition-colors">
              {t.switchToLogin}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
