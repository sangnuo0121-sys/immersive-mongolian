/**
 * 批量预渲染传统蒙古文词条为 SVG path 文件
 *
 * 数据源（按顺序尝试）：
 *   1. COZE_WORKSPACE_PATH/api 端点（实际数据库）
 *   2. 本地 src/data/corpus.ts（开发期 fallback）
 * 输出：public/mongolian-rendered/words/{id}.svg（纯 path-based）
 * 跑法：pnpm tsx scripts/generate-mongolian-word-svgs.mts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Blob, Face, Font, Buffer, shape } from "harfbuzzjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CORPUS_PATH = path.join(ROOT, "src/data/corpus.ts");
const FONT_PATH = path.join(ROOT, "public/fonts/NotoSansMongolian-Regular.ttf");
const OUT_DIR = path.join(ROOT, "public/mongolian-rendered/words");

/** 解析 corpus.ts：抽取所有 { id: '...', mongolian: '...' } 对 */
async function parseCorpusIds(corpusPath: string): Promise<Array<{ id: string; mongolian: string }>> {
  const text = await fs.readFile(corpusPath, "utf8");
  const re = /\{[^{}]*?id:\s*['"]([^'"]+)['"][^{}]*?mongolian:\s*['"]([^'"]+)['"]/g;
  const out: Array<{ id: string; mongolian: string }> = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    const mongolian = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, mongolian });
  }
  return out;
}

/** 从 API 拉取所有词条（实际数据库） */
async function fetchWordsFromApi(baseUrl: string): Promise<Array<{ id: string; mongolian: string }> | null> {
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/corpus`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: Array<{ id: string; mongolian?: string }> };
    if (!json.success || !Array.isArray(json.data)) return null;
    const out: Array<{ id: string; mongolian: string }> = [];
    const seen = new Set<string>();
    for (const w of json.data) {
      if (!w?.id || !w.mongolian) continue;
      if (seen.has(w.id)) continue;
      seen.add(w.id);
      out.push({ id: w.id, mongolian: w.mongolian });
    }
    return out;
  } catch {
    return null;
  }
}

function safeFilename(rawId: string): string {
  return (rawId || "word")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || "word";
}

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

async function main() {
  console.log("[generate-mongolian-svgs] start");
  console.log("  corpus:", CORPUS_PATH);
  console.log("  font:  ", FONT_PATH);
  console.log("  out:   ", OUT_DIR);

  try { await fs.access(FONT_PATH); }
  catch { throw new Error(`font not found: ${FONT_PATH}`); }

  await fs.mkdir(OUT_DIR, { recursive: true });

  // 数据源：先尝试 API（数据库），失败则读 corpus.ts
  const apiBase = process.env.MONGOLIAN_API_BASE
    || (process.env.DEPLOY_RUN_PORT ? `http://localhost:${process.env.DEPLOY_RUN_PORT}` : "http://localhost:5000");
  let words = await fetchWordsFromApi(apiBase);
  let source = "api";
  if (!words || words.length === 0) {
    console.log(`  [info] API unavailable, falling back to ${CORPUS_PATH}`);
    words = await parseCorpusIds(CORPUS_PATH);
    source = "corpus.ts";
  }
  console.log(`  source: ${source}`);
  console.log(`  parsed ${words.length} words`);

  const fontBytes = await fs.readFile(FONT_PATH);
  const arrayBuffer = fontBytes.buffer.slice(
    fontBytes.byteOffset,
    fontBytes.byteOffset + fontBytes.byteLength,
  );
  const hbBlob = new Blob(arrayBuffer);
  const hbFace = new Face(hbBlob, 0);
  const hbFont = new Font(hbFace);

  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const manifest: Array<{ id: string; file: string }> = [];

  for (const word of words) {
    const safeId = safeFilename(word.id);
    const fileName = `${safeId}.svg`;
    const outFile = path.join(OUT_DIR, fileName);

    try {
      const text = word.mongolian;
      if (!text) {
        skipCount++;
        continue;
      }

      const buffer = new Buffer();
      buffer.addText(text);
      buffer.guessSegmentProperties();
      shape(hbFont, buffer);

      const glyphs = buffer.getGlyphInfosAndPositions();
      if (!glyphs || glyphs.length === 0) {
        skipCount++;
        continue;
      }

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
        const rawD = String(hbFont.glyphToPath(g.codepoint));
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

      if (!isFinite(minX)) {
        skipCount++;
        continue;
      }

      const pad = 30;
      const viewW = maxX - minX + pad * 2;
      const viewH = maxY - minY + pad * 2;
      const dx = -minX + pad;
      const dy = -minY + pad;

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
      // Noto Sans Mongolian 在水平 shaping 下分两种情况：
      // 1. 原生 viewW > viewH（横版，字形真的横排）→ 整体顺时针旋转 90° 变竖版
      // 2. 原生 viewW ≤ viewH（已竖排，因为 xAdvance=0，字形自然堆成一列）→ 保持不动
      // 旋转 90° CW 公式（绕原点 (x,y)→(-y,x) 后再平移）：
      //   translate(viewH, 0) rotate(90)
      //   老 (0, 0) → (viewH, 0)   [左上 → 右上]
      //   老 (viewW, 0) → (viewH, viewW) [右上 → 右下]
      //   老 (0, viewH) → (0, 0)   [左下 → 左上]
      //   老 (viewW, viewH) → (0, viewW) [右下 → 左下]
      // 规范化视觉字号：旋转后 finalW 对应"单字宽度"（字身厚度），finalH 对应累计文本长度
      // 把 finalW 统一到 TARGET_LETTER_WIDTH，比例同步缩放 finalH，让所有词条视觉字号一致
      const isLandscape = viewW > viewH;
      const TARGET_LETTER_WIDTH = 1000;
      const origFinalW = isLandscape ? viewH : viewW;
      const origFinalH = isLandscape ? viewW : viewH;
      const scale = TARGET_LETTER_WIDTH / origFinalW;
      const finalW = TARGET_LETTER_WIDTH;
      const finalH = origFinalH * scale;
      const transform = isLandscape
        ? `transform="translate(${(viewH * scale).toFixed(2)} 0) rotate(90)"`
        : "";
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `viewBox="0 0 ${finalW.toFixed(2)} ${finalH.toFixed(2)}" ` +
        `width="${finalW.toFixed(2)}" height="${finalH.toFixed(2)}" ` +
        `role="img" aria-label="${word.id}">` +
        (transform ? `<g ${transform}>` : "") +
        `<g transform="scale(${scale.toFixed(6)})">` +
        `<path d="${pathD}" fill="currentColor"/>` +
        `</g>` +
        (transform ? `</g>` : "") +
        `</svg>`;

      await fs.writeFile(outFile, svg, "utf8");
      okCount++;
      manifest.push({ id: word.id, file: fileName });
    } catch (err) {
      failCount++;
      console.error(`  [fail] ${word.id}:`, err);
    }
  }

  const manifestPath = path.join(OUT_DIR, "manifest.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify({ generated: new Date().toISOString(), words: manifest }, null, 2),
    "utf8",
  );

  console.log(`[generate-mongolian-svgs] done. ok=${okCount} skip=${skipCount} failed=${failCount} manifest=${manifestPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
