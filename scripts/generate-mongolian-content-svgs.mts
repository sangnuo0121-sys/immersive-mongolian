/**
 * 批量预渲染非词条内容（首页 hero、智慧语录、鸣谢、声音档案、文化传统）的传统蒙古文为 SVG path 文件。
 *
 * 与 word 脚本（generate-mongolian-word-svgs.mts）保持自包含结构：
 *   - 直接 import harfbuzzjs
 *   - 自带 parsePath/serializePath/loadFont/shapeOne
 *   - 与 src/lib/mongolian-svg.ts 共享核心算法（keep in sync）
 *
 * 数据源（按顺序尝试）：
 *   1. 通过 HTTP 调用当前 dev/prod server 的 /api 端点（实际数据库）
 *   2. 失败则跳过该 category
 *
 * 输出目录：
 *   public/mongolian-rendered/hero/{id}.svg
 *   public/mongolian-rendered/wisdom/{id}.svg
 *   public/mongolian-rendered/acknowledgements/{id}.svg
 *   public/mongolian-rendered/archives/{id}.svg
 *   public/mongolian-rendered/culture/{id}.svg
 *
 * 跑法：DEPLOY_RUN_PORT=5000 pnpm tsx scripts/generate-mongolian-content-svgs.mts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Blob, Face, Font, Buffer, shape } from "harfbuzzjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const FONT_PATH = path.join(ROOT, "public/fonts/NotoSansMongolian-Regular.ttf");
const OUT_BASE = path.join(ROOT, "public/mongolian-rendered");

interface Job {
  id: string;
  mongolian: string;
  category: "hero" | "wisdom" | "acknowledgements" | "archives" | "culture";
}

interface Seg {
  cmd: "M" | "L" | "Q" | "C" | "Z";
  pts: number[];
}

const TARGET_LETTER_WIDTH = 1000;
const PADDING = 30;

function safeFilename(id: string): string {
  return id.replace(/[^a-z0-9_-]/gi, "-");
}

function parsePath(d: string): Seg[] {
  const out: Seg[] = [];
  const re = /([MLCQZ])([^MLCQZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d)) !== null) {
    const cmd = m[1] as Seg["cmd"];
    const numStr = m[2].trim();
    const pts: number[] = [];
    if (numStr) {
      const nums = numStr.split(/[\s,]+/).filter(Boolean).map(Number);
      for (const n of nums) {
        if (Number.isFinite(n)) pts.push(n);
      }
    }
    out.push({ cmd, pts });
  }
  return out;
}

function serializePath(segs: Seg[], dx: number, dy: number): string {
  const parts: string[] = [];
  for (const s of segs) {
    if (s.cmd === "M") {
      if (s.pts.length >= 2) {
        parts.push(`M ${(s.pts[0] + dx).toFixed(2)} ${(s.pts[1] + dy).toFixed(2)}`);
      }
    } else if (s.cmd === "L") {
      if (s.pts.length >= 2) {
        parts.push(`L ${(s.pts[0] + dx).toFixed(2)} ${(s.pts[1] + dy).toFixed(2)}`);
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

async function loadFont(): Promise<Font> {
  const fontData = await fs.readFile(FONT_PATH);
  const ab = fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  );
  const blob = new Blob(ab);
  const face = new Face(blob, 0);
  return new Font(face);
}

function shapeOne(hbFont: Font, text: string) {
  const buffer = new Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  shape(hbFont, buffer);
  const glyphs = buffer.getGlyphInfosAndPositions();
  if (!glyphs || glyphs.length === 0) return null;

  const allSegments: Array<{ segs: Seg[]; absX: number; absY: number }> = [];
  let cursorX = 0;
  let cursorY = 0;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

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
    let gMinX = Infinity,
      gMinY = Infinity,
      gMaxX = -Infinity,
      gMaxY = -Infinity;
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

  const viewW = maxX - minX + PADDING * 2;
  const viewH = maxY - minY + PADDING * 2;
  const dx = -minX + PADDING;
  const dy = -minY + PADDING;

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

  return { viewW, viewH, pathD: pathParts.join(" ") };
}

async function generateOne(
  hbFont: Font,
  job: Job,
): Promise<{ ok: boolean; file: string }> {
  const fileName = `${safeFilename(job.id)}.svg`;
  const outDir = path.join(OUT_BASE, job.category);
  const outFile = path.join(outDir, fileName);

  try {
    const text = job.mongolian;
    if (!text) return { ok: false, file: fileName };
    const result = shapeOne(hbFont, text);
    if (!result) return { ok: false, file: fileName };

    // 旋转判断：landscape 字形 → 旋转 90° CW，portrait（短串）保持原样
    const isLandscape = result.viewW > result.viewH;
    const origFinalW = isLandscape ? result.viewH : result.viewW;
    const origFinalH = isLandscape ? result.viewW : result.viewH;
    const scale = TARGET_LETTER_WIDTH / origFinalW;
    const finalW = TARGET_LETTER_WIDTH;
    const finalH = origFinalH * scale;
    const transformTag = isLandscape
      ? `<g transform="translate(${(result.viewH * scale).toFixed(2)} 0) rotate(90)">`
      : "";
    const transformEnd = isLandscape ? `</g>` : "";

    // fill 用 currentColor：浏览器/父容器 color CSS 决定实际颜色（默认黑色）
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `viewBox="0 0 ${finalW.toFixed(2)} ${finalH.toFixed(2)}" ` +
      `width="${finalW.toFixed(2)}" height="${finalH.toFixed(2)}" ` +
      `role="img" aria-label="${job.id}">` +
      transformTag +
      `<g transform="scale(${scale.toFixed(6)})">` +
      `<path d="${result.pathD}" fill="currentColor"/>` +
      `</g>` +
      transformEnd +
      `</svg>`;
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(outFile, svg, "utf8");
    return { ok: true, file: fileName };
  } catch (err) {
    console.error(`  [fail] ${job.category}/${job.id}:`, err);
    return { ok: false, file: fileName };
  }
}

async function fetchWisdomFromApi(apiBase: string): Promise<Job[] | null> {
  try {
    const res = await fetch(`${apiBase}/api/wisdom`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const arr = Array.isArray(json?.data) ? json.data : [];
    return arr
      .filter(
        (w: any) =>
          typeof w?.id === "string" && typeof w?.mongolian === "string",
      )
      .map((w: any) => ({
        id: w.id,
        mongolian: w.mongolian,
        category: "wisdom" as const,
      }));
  } catch {
    return null;
  }
}

async function fetchAcknowledgementsFromApi(apiBase: string): Promise<Job[] | null> {
  try {
    const res = await fetch(`${apiBase}/api/acknowledgements`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const arr = Array.isArray(json?.data) ? json.data : [];
    return arr
      .filter(
        (a: any) =>
          typeof a?.id === "string" && typeof a?.mongolianName === "string",
      )
      .map((a: any) => ({
        id: a.id,
        mongolian: a.mongolianName,
        category: "acknowledgements" as const,
      }));
  } catch {
    return null;
  }
}

async function fetchArchivesFromApi(apiBase: string): Promise<Job[] | null> {
  try {
    const res = await fetch(`${apiBase}/api/wisdom/oral-archives`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const arr = Array.isArray(json?.data) ? json.data : [];
    return arr
      .filter(
        (a: any) =>
          typeof a?.id === "string" && typeof a?.title?.mn === "string",
      )
      .map((a: any) => ({
        id: a.id,
        mongolian: a.title.mn,
        category: "archives" as const,
      }));
  } catch {
    return null;
  }
}

async function fetchCultureFromApi(apiBase: string): Promise<Job[] | null> {
  try {
    const res = await fetch(`${apiBase}/api/wisdom/culture-articles`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const arr = Array.isArray(json?.data) ? json.data : [];
    return arr
      .filter(
        (c: any) =>
          typeof c?.id === "string" && typeof c?.title?.mn === "string",
      )
      .map((c: any) => ({
        id: c.id,
        mongolian: c.title.mn,
        category: "culture" as const,
      }));
  } catch {
    return null;
  }
}

async function main() {
  console.log("[generate-mongolian-content-svgs] start");
  console.log("  font:  ", FONT_PATH);
  console.log("  out:   ", OUT_BASE);

  try {
    await fs.access(FONT_PATH);
  } catch {
    throw new Error(`font not found: ${FONT_PATH}`);
  }

  const apiBase =
    process.env.MONGOLIAN_API_BASE ||
    (process.env.DEPLOY_RUN_PORT
      ? `http://localhost:${process.env.DEPLOY_RUN_PORT}`
      : "http://localhost:5000");

  // Hero：固定内容（"蒙古"）
  const heroJobs: Job[] = [
    { id: "mongol", mongolian: "ᠮᠣᠩᠭᠣᠯ", category: "hero" },
  ];

  const wisdomJobs = (await fetchWisdomFromApi(apiBase)) ?? [];
  const ackJobs = (await fetchAcknowledgementsFromApi(apiBase)) ?? [];
  const archiveJobs = (await fetchArchivesFromApi(apiBase)) ?? [];
  const cultureJobs = (await fetchCultureFromApi(apiBase)) ?? [];

  const allJobs: Job[] = [
    ...heroJobs,
    ...wisdomJobs,
    ...ackJobs,
    ...archiveJobs,
    ...cultureJobs,
  ];
  console.log(
    `  total jobs: ${allJobs.length} ` +
      `(hero=${heroJobs.length}, wisdom=${wisdomJobs.length}, ack=${ackJobs.length}, ` +
      `archives=${archiveJobs.length}, culture=${cultureJobs.length})`,
  );

  if (allJobs.length === 0) {
    console.log("  nothing to do");
    return;
  }

  const hbFont = await loadFont();
  const manifest: Array<{ id: string; category: string; file: string }> = [];
  let okCount = 0,
    skipCount = 0,
    failCount = 0;

  for (const job of allJobs) {
    const r = await generateOne(hbFont, job);
    if (r.ok) {
      okCount++;
      manifest.push({ id: job.id, category: job.category, file: r.file });
    } else {
      const empty = job.mongolian ? "skip" : "fail";
      if (empty === "skip") skipCount++;
      else failCount++;
    }
  }

  // 写各 category 的 manifest
  for (const cat of [
    "hero",
    "wisdom",
    "acknowledgements",
    "archives",
    "culture",
  ] as const) {
    const dir = path.join(OUT_BASE, cat);
    await fs.mkdir(dir, { recursive: true });
    const items = manifest.filter((m) => m.category === cat);
    await fs.writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify(
        { generated: new Date().toISOString(), items },
        null,
        2,
      ),
      "utf8",
    );
  }

  console.log(
    `[generate-mongolian-content-svgs] done. ok=${okCount} skip=${skipCount} failed=${failCount}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
