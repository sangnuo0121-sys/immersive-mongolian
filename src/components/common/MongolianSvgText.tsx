"use client";

/**
 * MongolianSvgText —— 传统蒙古文统一显示组件
 *
 * 单一职责：把"蒙古文 Unicode 文本 + 预渲染 SVG 资源" 绑定到前端视觉输出。
 * 所有页面**禁止**直接渲染蒙古文 Unicode 作为主要视觉显示。
 *
 * 用法：
 *   <MongolianSvgText
 *     text={word.mongolian}
 *     svgUrl={word.mongolianImageSrc}
 *     variant="word"
 *     status="generated"
 *     fallbackText={word.mongolian}
 *     className="..."
 *   />
 *
 * 渲染规则（按 svgStatus 决定）：
 *  - generated + svgUrl   → 显示 SVG，text 仅做 alt / aria-label / 复制
 *  - pending              → 蒙古文显示生成中（占位）
 *  - failed               → 蒙古文显示生成失败（占位 + 复制可用）
 *  - outdated             → 蒙古文显示需要更新（占位 + 复制可用）
 *  - 资源缺失             → 用 <span lang="mn-Mong"> 整段显示，**不拆字**
 *
 * variant 主要用来标记语义，便于后续切换字号/列宽策略；当前视觉实现
 * 与 MongolianTextImage 保持一致，所有尺寸通过 className 控制（width 固定，height auto）。
 */

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { MongolianVariant } from "@/lib/mongolian-display";

export type MongolianSvgStatus = "pending" | "generated" | "failed" | "outdated";

export type MongolianSvgTextProps = {
  /** 原始蒙古文 Unicode 文本（仅用于 alt / aria-label / 复制） */
  text?: string | null;
  /** 预渲染 SVG 资源 URL（/mongolian-rendered/.../*.svg） */
  svgUrl?: string | null;
  /** 语义变体（word / quote / paragraph / hero / title / name / badge） */
  variant?: MongolianVariant;
  /** 同步状态（来自 DB / API 返回） */
  status?: MongolianSvgStatus;
  /** 兜底显示文本（默认等于 text） */
  fallbackText?: string;
  /** 替代 alt 文本（默认等于 text） */
  alt?: string;
  /** 容器 className（最外层） */
  className?: string;
  /** <img> 自身的 className（控制宽高、color、opacity） */
  imgClassName?: string;
  /** 懒加载 */
  loading?: "eager" | "lazy";
  /** 加载失败时回退到 <span> */
  hideFallback?: boolean;
  /** 复制按钮 ID（外部可触发） */
  copyKey?: string;
  /** 用于 React 列表 key 变化强制重渲染 */
  srcKey?: string;
  /** fetchpriority */
  fetchPriority?: "high" | "low" | "auto";
  /** 图标宽度/高度（默认 w-10 w-auto max-h-40） */
  widthClass?: string;
  heightClass?: string;
  maxHeightClass?: string;
};

const FALLBACK_STATUS_TEXT: Record<MongolianSvgStatus, string> = {
  pending: "蒙古文显示生成中…",
  generated: "",
  failed: "蒙古文显示生成失败",
  outdated: "蒙古文显示需要更新",
};

/**
 * 统一显示组件
 */
export function MongolianSvgText(props: MongolianSvgTextProps) {
  const {
    text,
    svgUrl,
    variant = "word",
    status = "generated",
    fallbackText,
    alt,
    className,
    imgClassName,
    loading = "lazy",
    hideFallback = false,
    srcKey,
    fetchPriority,
    widthClass = "w-10",
    heightClass = "h-auto",
    maxHeightClass = "max-h-40",
  } = props;

  const effectiveAlt = alt ?? text ?? fallbackText ?? "";
  const effectiveFallback = fallbackText ?? text ?? "";

  // svgUrl 必须是 /mongolian-rendered/ 开头或 http(s)://，否则视为不可信
  const safeSvgUrl = useMemo(() => {
    if (!svgUrl) return null;
    if (svgUrl.startsWith("/")) return svgUrl;
    if (/^https?:\/\//.test(svgUrl)) return svgUrl;
    return null;
  }, [svgUrl]);

  // 已生成 + 有 URL → 主显示
  if (status === "generated" && safeSvgUrl) {
    return (
      <span
        className={cn("mongolian-svg-text inline-block", className)}
        data-variant={variant}
        data-status={status}
        lang="mn-Mong"
        data-copy-text={effectiveFallback}
        aria-label={effectiveAlt}
      >
        <img
          key={srcKey}
          src={safeSvgUrl}
          alt={effectiveAlt}
          loading={loading}
          decoding="async"
          {...(fetchPriority ? { fetchPriority } : {})}
          draggable={false}
          className={cn(widthClass, heightClass, maxHeightClass, imgClassName)}
        />
      </span>
    );
  }

  // pending / failed / outdated 状态 → 占位 + 复制
  const statusLabel = FALLBACK_STATUS_TEXT[status] || FALLBACK_STATUS_TEXT.outdated;
  if (status === "pending") {
    return (
      <span
        className={cn(
          "mongolian-svg-text inline-flex items-center gap-1 rounded border border-dashed border-amber-300 bg-amber-50 px-1 text-[10px] text-amber-700",
          className,
        )}
        data-variant={variant}
        data-status={status}
        aria-label={statusLabel}
      >
        {statusLabel}
      </span>
    );
  }

  // failed / outdated 状态 → 占位 + 原始 text 可复制
  if (status === "failed" || status === "outdated") {
    return (
      <span
        className={cn(
          "mongolian-svg-text inline-flex items-center gap-1 rounded border border-dashed border-rose-300 bg-rose-50 px-1 text-[10px] text-rose-700",
          className,
        )}
        data-variant={variant}
        data-status={status}
        lang="mn-Mong"
        data-copy-text={effectiveFallback}
        aria-label={`${statusLabel}：${effectiveAlt}`}
      >
        {statusLabel}
        {effectiveFallback ? (
          <span className="ml-1 opacity-50" aria-hidden="true">
            （{effectiveFallback.length > 12 ? "…" : ""}）
          </span>
        ) : null}
      </span>
    );
  }

  // 资源缺失或 status 未传：回退整段蒙古文（不拆字）
  if (hideFallback) {
    return (
      <span
        className={cn("mongolian-svg-text inline-block", className)}
        data-variant={variant}
        data-status="missing"
        aria-label={effectiveAlt}
      />
    );
  }
  return (
    <span
      className={cn("mongolian-svg-text inline-block", className)}
      data-variant={variant}
      data-status="fallback"
      lang="mn-Mong"
      data-copy-text={effectiveFallback}
      aria-label={effectiveAlt}
    >
      {effectiveFallback}
    </span>
  );
}

export default MongolianSvgText;
