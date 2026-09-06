/**
 * 蒙古文 Unicode 文本哈希
 *
 * 用于判断"这个蒙古文字段是否变了"——只要 hash 变化，就视为内容变化，
 * 必须重新生成 SVG 显示资源。
 *
 * 用 djb2 风格的轻量 hash；这里不需要加密强度，只需要稳定 + 快速。
 * 在 Node 端用 crypto 也可，但为了能在浏览器 fallback 链路里复用，保持纯函数。
 */
export function hashMongolianText(text: string | null | undefined): string {
  if (!text) return "empty";
  // NFC 归一化：避免 macOS 合成字符和预组合字符造成"看上去一样但 hash 不同"
  const normalized = text.normalize("NFC");
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    // hash * 33 + c (djb2)
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  // 转成无符号 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}
