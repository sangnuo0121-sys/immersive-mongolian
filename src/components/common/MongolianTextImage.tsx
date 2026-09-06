/**
 * MongolianTextImage —— 显示传统蒙古文 SVG path 预渲染文件
 *
 * 重要：所有词条的传统蒙古文都在 build 阶段被预渲染成
 * 纯 path 的 SVG 文件（public/mongolian-rendered/words/），
 * 这里只是 <img> 加载，不依赖浏览器蒙古文 shaping。
 *
 * 图片加载失败时，使用 fallbackText 兜底（纯文本，整段渲染，不拆分）。
 */
"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  getMongolianImageSrc,
  getMongolianFallbackApiUrl,
} from "@/lib/mongolian-image-src";
import { hashMongolianText } from "@/lib/mongolian-display/hash";
import { AppContext } from "@/context/AppContext";

/**
 * MongolianTextImage 把传入的 type 映射到 AppContext.staleMongolianIds 的分类键。
 * - word → words（词条）
 * - wisdom → wisdom（智慧语录）
 * - ack → acknowledgements（鸣谢）
 * - archive / culture / cultureContent / hero 不参与 stale 追踪，返回 null
 */
function mapTypeToStaleCategory(
  type: MongolianContentType,
): "words" | "wisdom" | "acknowledgements" | null {
  if (type === "word") return "words";
  if (type === "wisdom") return "wisdom";
  if (type === "ack") return "acknowledgements";
  return null;
}

export type MongolianContentType =
  | "word"
  | "wisdom"
  | "archive"
  | "culture"
  | "cultureContent"
  | "ack"
  | "hero";

export type MongolianTextImageProps = {
  /** 直接传入 src；不传则根据 wordId 推导 */
  src?: string;
  /** 词条 id（用于推导 src） */
  wordId?: string;
  /**
   * 内容类型（决定 fallback API 路由的 DB 表 / 字段 / 缓存目录）
   * 词条=word / 智慧语录=wisdom / 声音档案=archive / 文化传统=culture / 鸣谢=ack
   */
  type?: MongolianContentType;
  /** 必填：原始蒙古文文本，用于 alt 和 fallback */
  alt: string;
  /** 加载失败时显示的兜底文本（一般等于原始蒙古文） */
  fallbackText?: string;
  /** 容器 className */
  className?: string;
  /** 图片 className */
  imgClassName?: string;
  /** 显式 width */
  width?: number;
  /** 显式 height */
  height?: number;
  /** 加载策略：列表用 lazy，首屏关键词用 eager */
  loading?: "lazy" | "eager";
  /** fetchpriority */
  fetchPriority?: "high" | "low" | "auto";
  /** decoding hint */
  decoding?: "async" | "sync" | "auto";
  /**
   * 显式 resetKey 前缀（默认用 wordId）。
   * ⚠️ 不要只用 id —— id 不变但内容变了就不会 remount。
   *    推荐在父组件传：key={`${word.id}-${word.mongolian}`}
   *    这样 React 会在内容变化时整体 remount 组件，彻底重置内部 stage。
   */
  srcKey?: string;
  /**
   * 显式内容版本号（数据源可控）。改值会强制 remount。
   * 比如 updatedAt / version / hash(content)，不传就用 alt 算 hash。
   */
  expectedVersion?: string | number;
};

/**
 * 在已有 URL 后面追加 version query string。
 * 蒙古文 Unicode 变化时，version 也变 → 浏览器绕过 <img> 强缓存，必须重新拉 SVG。
 */
function appendVersionToUrl(url: string, version: string): string {
  if (!url) return url;
  if (!version) return url;
  // 删除已有的 v= 参数（避免叠加：v=AAA&v=BBB）
  const cleaned = url.replace(/[?&]v=[^&]*/g, "");
  const sep = cleaned.includes("?") ? "&" : "?";
  return `${cleaned}${sep}v=${encodeURIComponent(version)}`;
}

export function MongolianTextImage({
  src,
  wordId,
  type = "word",
  alt,
  fallbackText,
  className,
  imgClassName,
  width,
  height,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
  srcKey,
  expectedVersion,
}: MongolianTextImageProps) {
  // 关键：把 alt (蒙古文原文) 算成一个稳定 hash，追加到所有 <img> src 后面。
  // 当蒙古文被改写后，hash 变，URL 变，浏览器 <img> 的 HTTP 强缓存被绕过，
  // 自动重新拉 SVG —— 不再需要手动 F5 刷新。
  const version = useMemo(
    () => (expectedVersion != null ? String(expectedVersion) : hashMongolianText(alt)),
    [alt, expectedVersion],
  );

  const baseSrc = src || (wordId ? getMongolianImageSrc(wordId) : undefined);
  const initialSrc = baseSrc ? appendVersionToUrl(baseSrc, version) : undefined;
  const fallbackSrc = wordId
    ? appendVersionToUrl(getMongolianFallbackApiUrl(type, wordId), version)
    : undefined;

  // 方案A：检测此 wordId 是否被标记为 stale（生产环境下 SVG 写盘失败的词条）。
  // 若为 stale → 跳过静态文件，直接使用 API 端点动态生成。
  // 用 useContext 而不是 useApp 是为了避免在没有 Provider 时崩溃（容错）。
  const appCtx = useContext(AppContext);
  const staleCategory = mapTypeToStaleCategory(type);
  const isStale =
    !!wordId &&
    !!staleCategory &&
    !!appCtx?.isMongolianStale?.(staleCategory, wordId);

  // 状态机：loading → ready（成功） → errored（已尝试 fallback）
  //        └─────────────────────────────→ api（从静态降级到 API 端点）
  const [stage, setStage] = useState<"loading" | "api" | "errored">(
    isStale && fallbackSrc ? "api" : "loading",
  );
  const resolvedSrc = (() => {
    const base = stage === "api" && fallbackSrc ? fallbackSrc : initialSrc;
    // stale 词条 → API 端点也传 &stale=1，让服务端跳过磁盘缓存直接动态生成
    if (base && isStale) {
      return base + "&stale=1";
    }
    return base;
  })();

  // 用 `${srcKey|wordId}-${version}` 作为 React key。
  // 关键：必须包含 version，否则内容变了 key 不变，img 不会 remount。
  // 即使父组件没传 key，这里也能保证 alt 变化时 img 被完全替换。
  const idPart = srcKey || wordId || "no-id";
  const resetKey = `${idPart}-${version}`;

  // 监听 alt/version 变化时重置 stage，避免组件复用时 stage 停留在旧值
  // （比如从 'api' 降级态切到新内容时还在用旧 fallbackSrc）。
  const prevVersionRef = useRef(version);
  useEffect(() => {
    if (prevVersionRef.current !== version) {
      prevVersionRef.current = version;
      setStage(isStale && fallbackSrc ? "api" : "loading");
    }
  }, [version, isStale, fallbackSrc]);

  // 监听 isStale 变化（如刚刚被标记 stale 时立即切到 API）
  // 注意：即使 stage 当前是 "errored"（静态文件加载失败后显示 fallback 文字），
  // 也要切到 "api"——因为 stale 标记意味着后端已经动态生成了新的 SVG。
  const prevStaleRef = useRef(isStale);
  useEffect(() => {
    if (prevStaleRef.current !== isStale) {
      prevStaleRef.current = isStale;
      if (isStale && fallbackSrc) {
        setStage("api");
      }
    }
  }, [isStale, fallbackSrc]);

  // 开发环境提示：词条没有生成对应 SVG
  if (process.env.NODE_ENV !== "production" && !resolvedSrc && wordId) {
     
    console.warn(`Missing mongolianImageSrc for word: ${wordId}`);
  }

  if (!initialSrc || stage === "errored") {
    return (
      <span
        key={`fb-${resetKey}`}
        className={`mongolian-image-fallback ${className || ""}`}
        lang="mn-Mong"
        role="img"
        aria-label={alt}
        style={{
          display: "inline-block",
          writingMode: "vertical-lr",
          textOrientation: "sideways",
          fontFamily:
            '"Mongolian Baiti", "Noto Sans Mongolian", "NotoSansMongolian", serif',
          fontWeight: 400,
          fontStyle: "normal",
          fontVariantLigatures: "normal",
          letterSpacing: 0,
          wordSpacing: "normal",
          lineHeight: 1.8,
          whiteSpace: "nowrap",
          overflow: "visible",
          direction: "ltr",
          unicodeBidi: "isolate",
          maxHeight: "100%",
          maxWidth: "100%",
        }}
      >
        {fallbackText ?? alt}
      </span>
    );
  }

  return (
    <span
      key={`img-${resetKey}`}
      className={`mongolian-image-root ${className || ""}`}
      style={{
        display: "inline-block",
        lineHeight: 0,
        overflow: "visible",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`${resetKey}-${stage}`}
        src={resolvedSrc}
        alt={alt}
        className={imgClassName}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        onError={() => {
          // 静态 SVG 不存在 → 降级到 API 端点；API 端点也 404 → fallback 文本
          if (stage === "loading" && fallbackSrc) {
            setStage("api");
          } else {
            setStage("errored");
          }
        }}
        style={{
          display: "block",
          objectFit: "contain",
          maxWidth: "100%",
          maxHeight: "100%",
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
          color: "currentColor",
        }}
      />
    </span>
  );
}

export default MongolianTextImage;
