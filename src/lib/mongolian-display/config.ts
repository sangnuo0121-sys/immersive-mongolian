/**
 * 蒙古文字段统一配置
 *
 * 单一事实来源（Single Source of Truth）：
 * 任何"这个表里哪些字段是蒙古文"的问题，必须来这里查。
 *
 * 字段说明：
 *  - field：数据库表中的蒙古文 Unicode 文本字段名
 *  - svgField：预渲染 SVG 缓存的逻辑名（与 id 一起用于文件路径）
 *  - variant：渲染变体（word/quote/paragraph/hero/title/name/badge），
 *    决定 generateMongolianSvg 的字号 / 列宽 / 视觉节奏
 *  - type：API 路由 type 参数，决定缓存目录
 *  - dir：磁盘缓存目录名（与 src/lib/mongolian-image-src.ts 保持一致）
 *  - filenameSuffix：可选，content_mn 等需要区分 title/content 时使用
 *  - table：数据库表名
 *  - column：表内蒙古文列名（与 field 同义；明确写出方便类型推导）
 *
 * 复用现有约定，不新增冗余字段：
 *  - 词条 mongolianImageSrc 仍然直接用 /words/{id}.svg
 *  - wisdom / archive / culture / ack 沿用现有命名
 *  - content_mn 通过 filenameSuffix 区分 culture title / content
 */
export type MongolianVariant =
  | "word"        // 单词
  | "quote"       // 智慧语录 / 例句
  | "paragraph"   // 文化正文
  | "hero"        // 首页大字
  | "title"       // 标题
  | "name"        // 人名
  | "badge";      // 等级名 / 角标

export type MongolianFieldSpec = {
  /** DB 字段名（驼峰 → 下划线映射在 sync 层做） */
  field: string;
  /** 渲染变体（决定字号、列宽、视觉节奏） */
  variant: MongolianVariant;
  /** API 路由 type 参数 */
  type: "word" | "wisdom" | "archive" | "culture" | "cultureContent" | "ack" | "hero";
  /** 磁盘缓存子目录名 */
  dir: string;
  /** 文件名后缀（可选），用于 culture title / content 区分 */
  filenameSuffix?: string;
  /** 同步时是否生成 SVG（默认 true）。hero 类静态资源可关掉 */
  generate?: boolean;
};

export type TableSpec = {
  /** Supabase 表名（与 getClient 配套） */
  table: string;
  /** 主键列名（用于 .eq(id) 定位记录） */
  idColumn?: string;
  /** 该表内所有蒙古文字段 */
  fields: MongolianFieldSpec[];
};

/**
 * 统一字段映射配置 —— 所有包含蒙古文的表都登记在这里
 */
export const MONGOLIAN_FIELDS_CONFIG: Record<string, TableSpec> = {
  // 词条表：mongolian（主） + example_mongolian（例句）
  words: {
    table: "words",
    idColumn: "id",
    fields: [
      {
        field: "mongolian",
        variant: "word",
        type: "word",
        dir: "words",
      },
      {
        field: "example_mongolian",
        variant: "quote",
        type: "word", // 例句 SVG 仍归在 words 目录，按 id 区分
        dir: "words",
        filenameSuffix: "example",
      },
    ],
  },

  // 智慧语录表
  wisdom_quotes: {
    table: "wisdom_quotes",
    idColumn: "id",
    fields: [
      {
        field: "mongolian",
        variant: "quote",
        type: "wisdom",
        dir: "wisdom",
      },
    ],
  },

  // 声音档案表：title_mn + description_mn
  oral_archives: {
    table: "oral_archives",
    idColumn: "id",
    fields: [
      {
        field: "title_mn",
        variant: "title",
        type: "archive",
        dir: "archives",
      },
      {
        field: "description_mn",
        variant: "paragraph",
        type: "archive",
        dir: "archives",
        filenameSuffix: "desc",
      },
    ],
  },

  // 文化传统表：title_mn + content_mn
  culture_articles: {
    table: "culture_articles",
    idColumn: "id",
    fields: [
      {
        field: "title_mn",
        variant: "title",
        type: "culture",
        dir: "culture",
      },
      {
        field: "content_mn",
        variant: "paragraph",
        type: "cultureContent",
        dir: "culture-content",
        filenameSuffix: "content",
      },
    ],
  },

  // 鸣谢表
  acknowledgements: {
    table: "acknowledgements",
    idColumn: "id",
    fields: [
      {
        field: "mongolian_name",
        variant: "name",
        type: "ack",
        dir: "acknowledgements",
      },
      {
        field: "contribution_description", // 中文贡献描述（不一定是蒙文，但若有蒙文版本则归此类）
        variant: "paragraph",
        type: "ack",
        dir: "acknowledgements",
        filenameSuffix: "contrib",
        generate: false, // 中文为主，仅当字段里出现蒙文时再单独处理；目前 skip
      },
    ],
  },

  // 主题表（categories）
  themes: {
    table: "categories",
    idColumn: "slug", // themes 用 slug 做主键
    fields: [], // 目前 categories 表没有蒙文列（name_zh/name_en）；保留占位
  },

  // 首页 hero（静态资源，不在 DB；保留配置占位）
  homepage_content: {
    table: "__static__",
    fields: [],
  },
};

/**
 * 驼峰 → 下划线映射：把 JS 端 fields（如 mongolianName）映射到 DB 列名
 */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

/**
 * 给定 DB 表名，查询对应的配置项
 */
export function getTableSpec(tableName: string): TableSpec | null {
  return MONGOLIAN_FIELDS_CONFIG[tableName] || null;
}

/**
 * 给定 DB 表名 + 字段名（驼峰或下划线都可），返回 spec
 */
export function getFieldSpec(
  tableName: string,
  fieldName: string,
): MongolianFieldSpec | null {
  const spec = getTableSpec(tableName);
  if (!spec) return null;
  const normalized = fieldName.includes("_") ? fieldName : camelToSnake(fieldName);
  return spec.fields.find((f) => f.field === normalized || f.field === fieldName) || null;
}
