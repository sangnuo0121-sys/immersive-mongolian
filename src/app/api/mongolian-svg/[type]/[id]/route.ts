import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { generateMongolianSvg, safeFilename } from "@/lib/mongolian-svg";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MongolianType =
  | "word"
  | "wisdom"
  | "archive"
  | "culture"
  | "cultureContent"
  | "ack"
  | "hero";

const TYPE_TO_DIR: Record<MongolianType, string> = {
  word: "words",
  wisdom: "wisdom",
  archive: "archives",
  culture: "culture",
  cultureContent: "culture-content",
  ack: "acknowledgements",
  hero: "hero",
};

// culture 类型查 title_mn（短标题，预渲染）
// cultureContent 类型查 content_mn（长正文，内容渲染）
const TYPE_TO_TABLE: Record<MongolianType, { table: string; column: string } | null> = {
  word: { table: "words", column: "mongolian" },
  wisdom: { table: "wisdom_quotes", column: "mongolian" },
  archive: { table: "oral_archives", column: "title_mn" },
  culture: { table: "culture_articles", column: "title_mn" },
  cultureContent: { table: "culture_articles", column: "content_mn" },
  ack: { table: "acknowledgements", column: "mongolian_name" },
  hero: null, // hero is static (not in DB)
};

function getSupabase() {
  const url =
    process.env.COZE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.COZE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const { type: rawType, id } = await params;
  if (!id) {
    return new NextResponse("missing id", { status: 400 });
  }
  const type = (rawType as MongolianType) in TYPE_TO_DIR ? (rawType as MongolianType) : "word";

  const dirName = TYPE_TO_DIR[type];
  const cacheDir = path.join(process.cwd(), "public", "mongolian-rendered", dirName);
  const filename = `${safeFilename(id)}.svg`;
  const filePath = path.join(cacheDir, filename);

  // 1) 命中磁盘缓存，直接返回（但 stale=1 时跳过，因为磁盘上还是旧 SVG）
  const forceRegenerate = _request.nextUrl.searchParams.get("stale") === "1";
  if (!forceRegenerate) {
    try {
      const buf = await fs.readFile(filePath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
        },
      });
    } catch {
      // 缓存未命中 → 继续走生成逻辑
    }
  }

  // 2) hero 是静态资源，不查 DB
  if (type === "hero") {
    return new NextResponse("not found (hero is static)", { status: 404 });
  }

  // 3) 从数据库取蒙古文
  const supabase = getSupabase();
  let mongolianText: string | null = null;

  const tableConfig = TYPE_TO_TABLE[type];
  if (supabase && tableConfig) {
    try {
      const { data, error } = await supabase
        .from(tableConfig.table)
        .select(`id, ${tableConfig.column}`)
        .eq("id", id)
        .maybeSingle();
      if (!error && data) {
        mongolianText = (data as unknown as Record<string, unknown>)[tableConfig.column] as string | null;
      }
    } catch {
      // 继续走 fallback
    }
  }

  if (!mongolianText) {
    return new NextResponse("not found", { status: 404 });
  }

  // 4) 生成 SVG
  let svg: string | null = null;
  try {
    svg = await generateMongolianSvg(mongolianText, { id });
  } catch (err) {
    console.error("[mongolian-svg] generate failed", err);
    return new NextResponse("generation failed", { status: 500 });
  }
  if (!svg) {
    return new NextResponse("empty", { status: 500 });
  }

  // 5) 落盘是 best-effort：失败也照常返回 SVG
  //    生产环境（/opt/bytefaas）文件系统只读，跳过写盘避免 EROFS 噪声
  if (process.env.NODE_ENV !== "production") {
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(filePath, svg, "utf8");
    } catch (err) {
      console.warn("[mongolian-svg] cache write failed", err);
    }
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
