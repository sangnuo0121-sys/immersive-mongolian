/**
 * 蒙古文 SVG 生成 / 缓存封装
 *
 * 把 scripts/generate-mongolian-*-svgs.mts 和 /api/mongolian-svg/[type]/[id] 之间的
 * 公共逻辑收敛到这里：
 *  - 调用 generateMongolianSvg() 生成 SVG 字符串
 *  - 写盘到 public/mongolian-rendered/{dir}/{filename}
 *  - 失效旧文件（按 filename）
 *
 * 这是 server-only 模块（依赖 node:fs），不能在浏览器里直接 import。
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  generateMongolianSvg,
  safeFilename,
  type GenerateOptions,
} from "@/lib/mongolian-svg";
import type { MongolianFieldSpec } from "./config";

/**
 * 构造缓存文件路径
 */
export function getCacheFilePath(
  spec: MongolianFieldSpec,
  recordId: string,
): string {
  const fileName = spec.filenameSuffix
    ? `${safeFilename(recordId)}-${spec.filenameSuffix}.svg`
    : `${safeFilename(recordId)}.svg`;
  return path.join(process.cwd(), "public", "mongolian-rendered", spec.dir, fileName);
}

/**
 * 构造对外 URL（前端 img src 用）
 */
export function getCacheUrlPath(
  spec: MongolianFieldSpec,
  recordId: string,
): string {
  const fileName = spec.filenameSuffix
    ? `${safeFilename(recordId)}-${spec.filenameSuffix}.svg`
    : `${safeFilename(recordId)}.svg`;
  return `/mongolian-rendered/${spec.dir}/${fileName}`;
}

/**
 * 生成单个字段的 SVG 并落盘
 *
 * @returns 是否成功（false = 字段为空 / 文本无效 / 写入失败）
 */
export type FieldSvgResult = {
  ok: boolean;
  svg?: string;
  url?: string;
  error?: string;
  cached?: boolean;
};

export async function generateFieldSvg(
  spec: MongolianFieldSpec,
  recordId: string,
  text: string | null | undefined,
): Promise<FieldSvgResult> {
  if (spec.generate === false) {
    return { ok: false, error: "generate disabled" };
  }
  if (!text || !text.trim()) {
    return { ok: false, error: "empty text" };
  }
  let svg: string | null = null;
  try {
    const opts: GenerateOptions = { id: recordId };
    svg = await generateMongolianSvg(text, opts);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  if (!svg) {
    return { ok: false, error: "shaping returned empty glyphs" };
  }

  const filePath = getCacheFilePath(spec, recordId);
  let cacheWritable = true;
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, svg, "utf8");
  } catch (err) {
    // 生产环境 public/ 可能只读；写盘失败不视为生成失败，浏览器可直接
    // 访问 /api/mongolian-svg/[type]/[id] 实时拿到 SVG。Svg 已经在内存里。
    const msg = (err as Error).message || String(err);
    console.warn(`[mongolian-display] 写缓存失败 ${filePath}: ${msg}（将走 API 动态链路）`);
    cacheWritable = false;
  }
  return cacheWritable
    ? { ok: true, svg, url: getCacheUrlPath(spec, recordId), cached: true }
    : { ok: true, svg, url: getCacheUrlPath(spec, recordId), cached: false };
}

/**
 * 删除某条记录对应字段的 SVG 缓存
 *
 * ENOENT 视为成功（首次生成时本来就不存在）
 */
export async function invalidateFieldSvg(
  spec: MongolianFieldSpec,
  recordId: string,
): Promise<{ removed: boolean; path: string }> {
  const filePath = getCacheFilePath(spec, recordId);
  try {
    await fs.unlink(filePath);
    return { removed: true, path: filePath };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { removed: false, path: filePath };
    }
    console.warn(
      `[mongolian-display] invalidate failed: ${filePath} (${code})`,
    );
    return { removed: false, path: filePath };
  }
}

/**
 * 读取磁盘上的 SVG 文本（调试 / 元数据收集用）
 */
export async function readFieldSvg(
  spec: MongolianFieldSpec,
  recordId: string,
): Promise<string | null> {
  const filePath = getCacheFilePath(spec, recordId);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
