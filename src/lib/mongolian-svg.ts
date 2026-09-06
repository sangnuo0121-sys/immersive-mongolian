/**
 * 传统蒙古文 SVG 预渲染共享逻辑
 *
 * 同一份代码同时被 build 脚本（scripts/generate-mongolian-*）和
 * 运行时 API（/api/mongolian-svg/[id]）使用，保证新上传的词条
 * 也能立刻拿到与 build 阶段一致的 SVG 文件。
 *
 * 关键参数：TARGET_LETTER_WIDTH = 1000
 *   - 所有词条旋转/翻转后的 viewBox width 都规范化到 1000 单位
 *   - viewBox height 随字符数线性变化
 *   - 配合组件层 w-{N} h-auto 可以保证所有词条视觉字号统一
 */
import { Blob, Face, Font, Buffer, shape } from "harfbuzzjs";
import fs from "node:fs/promises";
import path from "node:path";

export const TARGET_LETTER_WIDTH = 1000;
export const FONT_RELATIVE_PATH = "public/fonts/NotoSansMongolian-Regular.ttf";

type Seg = { cmd: "M" | "L" | "Q" | "C" | "Z"; pts: number[] };

function parsePath(d: string): Seg[] {
  const re = /([MLCQZ])([^MLCQZ]*)/g;
  const out: Seg[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1] as Seg["cmd"];
    if (cmd === "Z") {
      out.push({ cmd: "Z", pts: [] });
      continue;
    }
    const nums = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
    out.push({ cmd, pts: nums });
  }
  return out;
}

function serializePath(segments: Seg[], dx: number, dy: number): string {
  const parts: string[] = [];
  for (const s of segments) {
    if (s.cmd === "Z") {
      parts.push("Z");
      continue;
    }
    if (s.cmd === "M" || s.cmd === "L") {
      if (s.pts.length >= 2) {
        parts.push(`${s.cmd} ${(s.pts[0] + dx).toFixed(2)} ${(s.pts[1] + dy).toFixed(2)}`);
      }
    } else if (s.cmd === "Q") {
      if (s.pts.length >= 4) {
        parts.push(
          `Q ${(s.pts[0] + dx).toFixed(2)} ${(s.pts[1] + dy).toFixed(2)} ` +
          `${(s.pts[2] + dx).toFixed(2)} ${(s.pts[3] + dy).toFixed(2)}`,
        );
      }
    } else if (s.cmd === "C") {
      if (s.pts.length >= 6) {
        parts.push(
          `C ${(s.pts[0] + dx).toFixed(2)} ${(s.pts[1] + dy).toFixed(2)} ` +
          `${(s.pts[2] + dx).toFixed(2)} ${(s.pts[3] + dy).toFixed(2)} ` +
          `${(s.pts[4] + dx).toFixed(2)} ${(s.pts[5] + dy).toFixed(2)}`,
        );
      }
    }
  }
  return parts.join(" ");
}

function safeFilename(rawId: string): string {
  return (
    (rawId || "word")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "word"
  );
}

// ============================================================
// HarfBuzz font 初始化（模块级缓存，避免重复读取/解析字体）
// ============================================================

let cachedFont: any = null;
let initPromise: Promise<any> | null = null;

async function initFont(): Promise<any> {
  if (cachedFont) return cachedFont;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const fontPath = path.join(process.cwd(), FONT_RELATIVE_PATH);
    const fontBytes = await fs.readFile(fontPath);
    const arrayBuffer = fontBytes.buffer.slice(
      fontBytes.byteOffset,
      fontBytes.byteOffset + fontBytes.byteLength,
    );
    const hbBlob = new Blob(arrayBuffer);
    const hbFace = new Face(hbBlob, 0);
    cachedFont = new Font(hbFace);
    return cachedFont;
  })();

  return initPromise;
}

// ============================================================
// 核心：generateMongolianSvg(text) → SVG 字符串
// ============================================================

export type GenerateOptions = {
  /** 内边距（单位：最终坐标系）。默认 30。 */
  padding?: number;
  /** 字符 id（用于 aria-label，可选） */
  id?: string;
};

export async function generateMongolianSvg(
  text: string,
  options: GenerateOptions = {},
): Promise<string | null> {
  if (!text) return null;
  const padding = options.padding ?? 30;
  const font = await initFont();

  const buffer = new Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  shape(font, buffer);

  const glyphs = buffer.getGlyphInfosAndPositions();
  if (!glyphs || glyphs.length === 0) return null;

  const allSegments: Array<{ segs: Seg[]; absX: number; absY: number }> = [];
  let cursorX = 0;
  let cursorY = 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const g of glyphs) {
    if (g.codepoint === 0) {
      cursorX += (g.xAdvance ?? 0);
      cursorY += (g.yAdvance ?? 0);
      continue;
    }
    const rawD = String(font.glyphToPath(g.codepoint));
    if (!rawD) {
      cursorX += (g.xAdvance ?? 0);
      cursorY += (g.yAdvance ?? 0);
      continue;
    }
    const segs = parsePath(rawD);
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    for (const s of segs) {
      if (s.cmd === "Z") continue;
      for (let i = 0; i < s.pts.length; i += 2) {
        const px = s.pts[i];
        const py = s.pts[i + 1];
        if (px < gMinX) gMinX = px;
        if (py < gMinY) gMinY = py;
        if (px > gMaxX) gMaxX = px;
        if (py > gMaxY) gMaxY = py;
      }
    }
    if (!isFinite(gMinX)) {
      cursorX += (g.xAdvance ?? 0);
      cursorY += (g.yAdvance ?? 0);
      continue;
    }
    const absX = cursorX + (g.xOffset ?? 0);
    const absY = cursorY + (g.yOffset ?? 0);
    allSegments.push({ segs, absX, absY });
    const flippedMinY = -gMaxY;
    const flippedMaxY = -gMinY;
    if (absX + gMinX < minX) minX = absX + gMinX;
    if (absY + flippedMinY < minY) minY = absY + flippedMinY;
    if (absX + gMaxX > maxX) maxX = absX + gMaxX;
    if (absY + flippedMaxY > maxY) maxY = absY + flippedMaxY;
    cursorX += (g.xAdvance ?? 0);
    cursorY += (g.yAdvance ?? 0);
  }

  if (!isFinite(minX)) return null;

  const viewW = maxX - minX + padding * 2;
  const viewH = maxY - minY + padding * 2;
  const dx = -minX + padding;
  const dy = -minY + padding;

  const pathParts: string[] = [];
  for (const s of allSegments) {
    const flipped = s.segs.map((seg) => {
      if (seg.cmd === "Z") return seg;
      const newPts: number[] = [];
      for (let i = 0; i < seg.pts.length; i += 2) {
        newPts.push(seg.pts[i] + s.absX);
        newPts.push(-seg.pts[i + 1] + s.absY);
      }
      return { cmd: seg.cmd, pts: newPts } as Seg;
    });
    pathParts.push(serializePath(flipped, dx, dy));
  }

  const pathD = pathParts.join(" ");

  // 旋转判断 + 字号归一化
  const isLandscape = viewW > viewH;
  const origFinalW = isLandscape ? viewH : viewW;
  const origFinalH = isLandscape ? viewW : viewH;
  const scale = TARGET_LETTER_WIDTH / origFinalW;
  const finalW = TARGET_LETTER_WIDTH;
  const finalH = origFinalH * scale;
  const transform = isLandscape
    ? `transform="translate(${(viewH * scale).toFixed(2)} 0) rotate(90)"`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="0 0 ${finalW.toFixed(2)} ${finalH.toFixed(2)}" ` +
    `width="${finalW.toFixed(2)}" height="${finalH.toFixed(2)}" ` +
    `role="img" aria-label="${(options.id || "mongolian").replace(/"/g, "&quot;")}">` +
    (transform ? `<g ${transform}>` : "") +
    `<g transform="scale(${scale.toFixed(6)})">` +
    `<path d="${pathD}" fill="currentColor"/>` +
    `</g>` +
    (transform ? `</g>` : "") +
    `</svg>`
  );
}

// ============================================================
// 文件落盘：cacheSvgToFile(id, text, baseDir) → filename
// ============================================================

export async function cacheSvgToFile(
  id: string,
  text: string,
  outDir: string,
): Promise<{ file: string; svg: string } | null> {
  const svg = await generateMongolianSvg(text, { id });
  if (!svg) return null;
  const file = `${safeFilename(id)}.svg`;
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, file), svg, "utf8");
  return { file, svg };
}

export { safeFilename };
