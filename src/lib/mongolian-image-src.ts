/**
 * 根据词条 id 推导传统蒙古文预渲染 SVG 的稳定路径。
 * 命名规则与 scripts/generate-mongolian-*-svgs.mts 中的 safeFilename 保持一致：
 *   - 转小写
 *   - 非 [a-z0-9_-] 替换为 -
 *   - 连续 - 折叠
 *   - 去掉首尾 -
 */
function safeId(id: string | undefined | null, fallback = "word"): string {
  if (!id) return fallback;
  return (
    id
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    || fallback
  );
}

/**
 * 把可选的 version 拼到 URL 后面作为 cache-buster。
 * 蒙古文 Unicode 文本变化时，version 也跟着变，
 * 浏览器就不会命中旧的 <img> 强缓存，必须重新拉 SVG。
 */
function withVersion(url: string, version?: string | null): string {
  if (!url) return url;
  if (!version) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

/** 词条 */
export function getMongolianImageSrc(
  wordId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(`/mongolian-rendered/words/${safeId(wordId, "word")}.svg`, version);
}

/** 智慧语录 */
export function getMongolianWisdomImageSrc(
  quoteId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(`/mongolian-rendered/wisdom/${safeId(quoteId, "wisdom")}.svg`, version);
}

/** 鸣谢 */
export function getMongolianAcknowledgementImageSrc(
  ackId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(
    `/mongolian-rendered/acknowledgements/${safeId(ackId, "ack")}.svg`,
    version,
  );
}

/** 声音档案 (Oral Archive) */
export function getMongolianArchiveImageSrc(
  archiveId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(
    `/mongolian-rendered/archives/${safeId(archiveId, "archive")}.svg`,
    version,
  );
}

/** 文化传统 (Culture Article) */
export function getMongolianCultureImageSrc(
  articleId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(
    `/mongolian-rendered/culture/${safeId(articleId, "culture")}.svg`,
    version,
  );
}

/** 文化传统 - 文章蒙古文正文 (culture.content_mn) */
export function getMongolianCultureContentImageSrc(
  articleId: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(
    `/mongolian-rendered/culture/${safeId(articleId, "culture")}-content.svg`,
    version,
  );
}

/** 首页 hero 等静态资源 */
export function getMongolianHeroImageSrc(
  key: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(`/mongolian-rendered/hero/${safeId(key, "hero")}.svg`, version);
}

/**
 * 给定 type + id，构造运行时 fallback API URL（用于静态 SVG 不存在时按需生成）。
 * 与 /api/mongolian-svg/[type]/[id]/route.ts 保持一致。
 */
export function getMongolianFallbackApiUrl(
  type: "word" | "wisdom" | "archive" | "culture" | "cultureContent" | "ack" | "hero",
  id: string | undefined | null,
  version?: string | null,
): string {
  return withVersion(`/api/mongolian-svg/${type}/${safeId(id, type)}`, version);
}
