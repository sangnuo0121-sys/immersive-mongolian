/**
 * 蒙古文显示同步逻辑（核心）
 *
 * 单一职责：给定一条数据库记录，根据其表名 + 字段，找到所有蒙古文字段，
 * 比较 hash 决定是否需要重新生成 SVG / path 显示资源。
 *
 * 任何 create / update / seed / import 入口都必须调用本模块。
 * 任何直接对 words / wisdom_quotes / oral_archives / culture_articles /
 * acknowledgements 的写入都应通过本模块生成的 syncMongolianDisplayForRecord
 * 来保证显示资源与 Unicode 文本同步。
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import {
  MONGOLIAN_FIELDS_CONFIG,
  getFieldSpec,
  getTableSpec,
  camelToSnake,
  type TableSpec,
  type MongolianFieldSpec,
} from "./config";
import { hashMongolianText } from "./hash";
import {
  generateFieldSvg,
  invalidateFieldSvg,
  getCacheUrlPath,
  getCacheFilePath,
  type FieldSvgResult,
} from "./generate";

// ============================================================
// 类型
// ============================================================

export type SvgStatus = "pending" | "generated" | "failed" | "outdated";

export type FieldSyncResult = {
  /** DB 字段名（snake_case） */
  field: string;
  /** 该字段的 spec */
  spec: MongolianFieldSpec;
  /** hash 状态：是否与上次同步结果相同 */
  hashChanged: boolean;
  /** 当前 Unicode hash */
  unicodeHash: string;
  /** 同步后的状态 */
  status: SvgStatus;
  /** 缓存 URL（成功时） */
  svgUrl?: string;
  /** 错误信息（失败时） */
  error?: string;
  /** 同步前是否原本有缓存 */
  hadExistingCache: boolean;
  /**
   * 磁盘缓存是否过期 / 不可写
   *
   * 当 SVG 在内存生成成功，但 fs.writeFile 因只读文件系统失败时，
   * 该字段为 true。此时磁盘上的旧 SVG 还在（或不存在），但与最新 Unicode 不符。
   *
   * 前端应该跳过静态 SVG 路径，直接请求 /api/mongolian-svg 动态生成端点。
   */
  cacheStale?: boolean;
};

export type RecordSyncResult = {
  tableName: string;
  recordId: string;
  /** 跳过同步原因（如表无蒙文字段） */
  skipped?: string;
  /** 各字段的同步结果 */
  fields: FieldSyncResult[];
  /** 整体是否成功 */
  ok: boolean;
  /**
   * 任一字段 cacheStale → true，前端拿到此标记需把 recordId 加入 stale 列表，
   * 让 <MongolianTextImage> 直接走 API 端点。
   */
  cacheStale: boolean;
  /** cacheStale 为 true 时，列出哪些字段的缓存已过期 */
  staleFields?: string[];
};

export type RecordInput = {
  /** 待同步的字段值（驼峰或下划线 key 都可） */
  [key: string]: unknown;
};

// ============================================================
// Supabase 客户端
// ============================================================

let _serviceClient: ReturnType<typeof createClient> | null = null;

function getServiceClient(): ReturnType<typeof createClient> | null {
  if (_serviceClient) return _serviceClient;
  const url =
    process.env.COZE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.COZE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!url || !key) return null;
  _serviceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _serviceClient;
}

// ============================================================
// DB 列推断
// ============================================================

function pickColumnValue(
  record: RecordInput,
  field: string,
): string | null {
  // 字段可能是下划线 (mongolian) 或驼峰 (mongolianName)
  const snakeValue = record[field];
  if (typeof snakeValue === "string") return snakeValue;
  if (snakeValue === null) return null;
  // 尝试驼峰映射
  const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const camelValue = record[camel];
  if (typeof camelValue === "string") return camelValue;
  if (camelValue === null) return null;
  return null;
}

// ============================================================
// 同步状态持久化（轻量：写到 record 自身的 _svg_status 字段）
// ============================================================

/**
 * 把同步结果回写到记录上的可选状态字段（如果表里有这些列）。
 * 这些列是可选的：sync 流程不应该因为列不存在而失败。
 */
async function writeBackStatusToRecord(
  spec: TableSpec,
  recordId: string,
  fieldResult: FieldSyncResult,
): Promise<void> {
  const client = getServiceClient();
  if (!client) return;
  // 状态字段命名约定：{field}_svg_status / {field}_svg_hash / {field}_svg_generated_at
  // 表里没有这些列也没关系，Supabase 会返回 PGRST204 / 42P01 等错误，我们静默吞掉
  const statusField = `${fieldResult.field}_svg_status`;
  const hashField = `${fieldResult.field}_svg_hash`;
  const atField = `${fieldResult.field}_svg_generated_at`;
  const idColumn = spec.idColumn || "id";
  try {
    // Supabase 的 update() 入参类型会被窄化为 never；用 .update() 的 any 形式
    const updatePayload: Record<string, string | null> = {
      [statusField]: fieldResult.status,
      [hashField]: fieldResult.unicodeHash,
      [atField]: new Date().toISOString(),
    };
    await (client
      .from(spec.table as string)
      .update(updatePayload as never) as unknown as { eq: (col: string, val: string) => Promise<unknown> })
      .eq(idColumn, recordId);
  } catch {
    // 列不存在 / 表无权限 → 不阻断同步流程
  }
}

// ============================================================
// 同步前读取 DB 现状（用于对比 hash）
// ============================================================

async function fetchRecordRow(
  spec: TableSpec,
  recordId: string,
): Promise<Record<string, unknown> | null> {
  const client = getServiceClient();
  if (!client) return null;
  const idColumn = spec.idColumn || "id";
  try {
    const { data, error } = await client
      .from(spec.table)
      .select("*")
      .eq(idColumn, recordId)
      .maybeSingle();
    if (error || !data) return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 同步单条记录的所有蒙古文字段
 *
 * 调用时机（强制）：任何 create / update / seed / import 写入完成之后。
 *
 * @param tableName Supabase 表名（参考 MONGOLIAN_FIELDS_CONFIG）
 * @param recordId  记录主键
 * @param record    （可选）写入时使用的字段值。如果不传，会从 DB 拉一遍
 *
 * 返回每字段的同步结果；调用方可以选择把 result.fields[i].svgUrl / status
 * 写回自己的表里（如果定义了 _svg_url / _svg_status 字段）。
 */
export async function syncMongolianDisplayForRecord(
  tableName: string,
  recordId: string,
  record?: RecordInput,
): Promise<RecordSyncResult> {
  const spec = getTableSpec(tableName);
  if (!spec) {
    return {
      tableName,
      recordId,
      skipped: `table ${tableName} not registered in MONGOLIAN_FIELDS_CONFIG`,
      fields: [],
      ok: false,
      cacheStale: false,
    };
  }
  if (!spec.fields || spec.fields.length === 0) {
    return {
      tableName,
      recordId,
      skipped: `table ${tableName} has no Mongolian fields`,
      fields: [],
      ok: false,
      cacheStale: false,
    };
  }

  // 没有传 record 就从 DB 拉
  const effectiveRecord: RecordInput = record || (await fetchRecordRow(spec, recordId)) || {};
  const dbRow = await fetchRecordRow(spec, recordId);

  const fieldResults: FieldSyncResult[] = [];
  let allOk = true;

  for (const fieldSpec of spec.fields) {
    const newText = pickColumnValue(effectiveRecord, fieldSpec.field);
    const newHash = hashMongolianText(newText);

    // 从 DB 取上次同步 hash（如果有 _svg_hash 列）
    const lastHash =
      (dbRow?.[`${fieldSpec.field}_svg_hash`] as string | undefined) || null;

    const hashChanged = newText !== null && lastHash !== null && lastHash !== newHash;
    const isNewRecord = lastHash === null;

    // 1) 文本为空：清理旧缓存（不视为错误）
    if (!newText || !newText.trim()) {
      await invalidateFieldSvg(fieldSpec, recordId);
      fieldResults.push({
        field: fieldSpec.field,
        spec: fieldSpec,
        hashChanged: false,
        unicodeHash: newHash,
        status: "pending",
        hadExistingCache: false,
        error: "empty text",
      });
      continue;
    }

    // 2) hash 没变且缓存已存在：跳过重新生成
    if (!hashChanged && !isNewRecord) {
      fieldResults.push({
        field: fieldSpec.field,
        spec: fieldSpec,
        hashChanged: false,
        unicodeHash: newHash,
        status: "generated",
        svgUrl: getCacheUrlPath(fieldSpec, recordId),
        hadExistingCache: true,
      });
      continue;
    }

    // 3) hash 变了 / 新记录 / 缓存缺失 → 重新生成
    // 先把旧缓存标 outdated（如果存在）
    if (!isNewRecord) {
      await invalidateFieldSvg(fieldSpec, recordId);
    }

    const result: FieldSvgResult = await generateFieldSvg(
      fieldSpec,
      recordId,
      newText,
    );

    const status: SvgStatus = result.ok
      ? "generated"
      : "failed";
    if (!result.ok) allOk = false;

    // 磁盘写失败但内存生成成功 → 标记 cacheStale，前端应改走 API 动态端点
    const fieldCacheStale = result.ok && result.cached === false;

    const fieldResult: FieldSyncResult = {
      field: fieldSpec.field,
      spec: fieldSpec,
      hashChanged,
      unicodeHash: newHash,
      status,
      hadExistingCache: !isNewRecord,
      cacheStale: fieldCacheStale,
    };
    if (result.ok) {
      fieldResult.svgUrl = getCacheUrlPath(fieldSpec, recordId);
    } else if (result.error) {
      fieldResult.error = result.error;
    }
    fieldResults.push(fieldResult);

    // 4) 回写状态到记录（best-effort）
    await writeBackStatusToRecord(spec, recordId, fieldResult);
  }

  const cacheStaleFields = fieldResults.filter((f) => f.cacheStale === true).map((f) => f.field);

  return {
    tableName,
    recordId,
    fields: fieldResults,
    ok: allOk,
    cacheStale: cacheStaleFields.length > 0,
    staleFields: cacheStaleFields.length > 0 ? cacheStaleFields : undefined,
  };
}

/**
 * 批量同步多条记录（用于 seed、importWords 等批量场景）
 *
 * 串行执行避免 harfbuzzjs 字体初始化竞态；并发会导致 OOM。
 */
export async function syncMongolianDisplayForRecords(
  tableName: string,
  recordIds: string[],
  records?: RecordInput[],
): Promise<RecordSyncResult[]> {
  const results: RecordSyncResult[] = [];
  for (let i = 0; i < recordIds.length; i++) {
    const rec = records?.[i];
    const result = await syncMongolianDisplayForRecord(
      tableName,
      recordIds[i],
      rec,
    );
    results.push(result);
  }
  return results;
}

/**
 * 把"标记旧 SVG 为 outdated"显式暴露出来。
 *
 * 当用户上传了一张新图片、或者某条记录要从 DB 软删除时，
 * 业务方可以显式调用此函数，让前端知道 SVG 需要更新。
 */
export async function markOldSvgAsOutdated(
  tableName: string,
  recordId: string,
): Promise<void> {
  const spec = getTableSpec(tableName);
  if (!spec) return;
  for (const fieldSpec of spec.fields) {
    await invalidateFieldSvg(fieldSpec, recordId);
    const client = getServiceClient();
    if (!client) continue;
    try {
      const updatePayload: Record<string, string | null> = {
        [`${fieldSpec.field}_svg_status`]: "outdated",
        [`${fieldSpec.field}_svg_hash`]: null,
      };
      await (client
        .from(spec.table as string)
        .update(updatePayload as never) as unknown as { eq: (col: string, val: string) => Promise<unknown> })
        .eq(spec.idColumn || "id", recordId);
    } catch {
      // 静默
    }
  }
}

/**
 * 单字段同步（外部一般不需要直接调用，由 syncMongolianDisplayForRecord 内部循环处理）
 *
 * @deprecated 多数场景应该用 syncMongolianDisplayForRecord
 */
export async function syncMongolianField(
  tableName: string,
  fieldName: string,
  recordId: string,
  record: RecordInput,
): Promise<FieldSyncResult | null> {
  const fieldSpec = getFieldSpec(tableName, fieldName);
  if (!fieldSpec) return null;
  const spec = getTableSpec(tableName);
  if (!spec) return null;

  const newText = pickColumnValue(record, fieldSpec.field);
  const newHash = hashMongolianText(newText);
  if (!newText || !newText.trim()) {
    await invalidateFieldSvg(fieldSpec, recordId);
    return {
      field: fieldSpec.field,
      spec: fieldSpec,
      hashChanged: false,
      unicodeHash: newHash,
      status: "pending",
      hadExistingCache: false,
      cacheStale: false,
    };
  }
  const result = await generateFieldSvg(fieldSpec, recordId, newText);
  return {
    field: fieldSpec.field,
    spec: fieldSpec,
    hashChanged: true,
    unicodeHash: newHash,
    status: result.ok ? "generated" : "failed",
    svgUrl: result.ok ? getCacheUrlPath(fieldSpec, recordId) : undefined,
    error: result.error,
    hadExistingCache: false,
    cacheStale: result.ok && result.cached === false,
  };
}

/**
 * 工具：根据 camelCase 字段名查找对应的 spec（兼容 JS 调用方）
 */
export { camelToSnake, getFieldSpec, getTableSpec, MONGOLIAN_FIELDS_CONFIG };

/**
 * 失效（删除）某条记录在 public/mongolian-rendered 下的所有 SVG 缓存文件。
 * 适用场景：删除记录时调用，避免留下孤儿文件。
 */
export async function invalidateMongolianSvgCache(
  tableName: string,
  recordId: string,
): Promise<void> {
  const spec = getTableSpec(tableName);
  if (!spec) return;
  // 词条：/words/{id}.svg；其他表同
  for (const field of spec.fields) {
    const absolute = getCacheFilePath(field, recordId);
    try {
      await fs.unlink(absolute);
    } catch {
      // 文件不存在 → 静默
    }
  }
}
