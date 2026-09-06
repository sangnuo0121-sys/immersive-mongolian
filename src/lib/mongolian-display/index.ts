/**
 * 蒙古文显示同步 —— 统一对外入口
 *
 * 用法：
 *   import { syncMongolianDisplayForRecord } from "@/lib/mongolian-display";
 *   await syncMongolianDisplayForRecord("words", wordId, wordRow);
 */
export {
  MONGOLIAN_FIELDS_CONFIG,
  getTableSpec,
  getFieldSpec,
  camelToSnake,
} from "./config";

export type {
  MongolianVariant,
  MongolianFieldSpec,
  TableSpec,
} from "./config";

export { hashMongolianText } from "./hash";

export {
  generateFieldSvg,
  invalidateFieldSvg,
  getCacheFilePath,
  getCacheUrlPath,
  readFieldSvg,
} from "./generate";

export {
  syncMongolianDisplayForRecord,
  syncMongolianDisplayForRecords,
  syncMongolianField,
  markOldSvgAsOutdated,
  invalidateMongolianSvgCache,
} from "./sync";

export type {
  SvgStatus,
  FieldSyncResult,
  RecordSyncResult,
  RecordInput,
} from "./sync";
