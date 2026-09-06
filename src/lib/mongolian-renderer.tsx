'use client';

/**
 * 蒙古文渲染工具类
 * 
 * 核心原则：
 * - 蒙古文必须整段渲染，不能拆分单个字符
 * - 整段渲染才能保证连写特性正常
 * - 使用内联 SVG + 页面全局字体（更可靠，跨浏览器一致）
 * - 同时在 SVG 中嵌入字体（兜底方案：若全局字体未加载）
 * - btoa() 对 Unicode 字符会抛出异常，需使用 TextEncoder 预编码
 * 
 * 修复历史：
 * - 2024-XX-XX: 字体文件被替换为 GitHub 404 HTML 页面，导致所有浏览器乱码
 *   修复：重新下载 Noto Sans Mongolian TTF 文件（387KB，正确头）
 *   + 改用 application/octet-stream MIME 类型（更通用）
 *   + 改用内联 SVG 方案，引用页面全局字体（Safari/Firefox/Edge 兼容）
 *   + 在 <text> 元素上直接设置 font-family 属性（多重保险）
 */

import { useEffect, useState, useRef, useCallback } from 'react';

// 字体加载 Promise
let fontLoadPromise: Promise<void> | null = null;
let fontLoaded = false;
let fontDataBase64: string | null = null;

// 渲染尺寸配置
const RENDER_CONFIG = {
  vertical: {
    baseWidth: 50,
    baseHeight: 140,
    fontSize: 36,
  },
  horizontal: {
    baseWidth: 160,
    baseHeight: 40,
    fontSize: 24,
  },
} as const;

// 类型定义
export interface RenderOptions {
  mode: 'vertical' | 'horizontal';
  bold?: boolean;
  fontSize?: number;
}

export interface RenderResult {
  svgDataUrl: string;
  /** 内联 SVG 字符串（推荐使用 - 跨浏览器兼容，无需嵌入字体） */
  inlineSvg: string;
  width: number;
  height: number;
}

// 缓存 Map
const renderCache = new Map<string, RenderResult>();

/**
 * Unicode 安全 Base64 编码
 * 
 * 标准 btoa() 只支持 Latin1 字符范围（0-255），
 * 蒙古文 Unicode 字符超出此范围会抛出 InvalidCharacterError。
 * 此函数先将字符串编码为 UTF-8 字节序列，再转换为 Base64。
 */
function unicodeToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 字体嵌入后的缓存 SVG 模板（避免重复嵌入字体）
const embeddedFontSvgTemplate: string | null = null;

/**
 * 获取已嵌入字体的 SVG 模板
 * 字体数据只嵌入一次，后续复用
 */
function getFontFaceDeclarations(): string {
  if (!fontDataBase64) return '';
  // 使用最通用的 MIME 类型 application/octet-stream + 简单字体族名 + unicode-range
  // 解决 Safari/Firefox/Edge 中 data URL 字体加载失败的问题
  return `@font-face {
      font-family: 'MongolianFallback';
      src: url(data:application/octet-stream;base64,${fontDataBase64});
      unicode-range: U+1800-18AF, U+1820-187F, U+1880-18AA, U+202F, U+180E, U+200C-200F;
    }`;
}

/**
 * 加载蒙古文字体并获取 Base64 数据
 */
async function loadFontData(): Promise<string | null> {
  if (fontDataBase64) return fontDataBase64;
  
  try {
    const response = await fetch('/fonts/NotoSansMongolian-Regular.ttf');
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    fontDataBase64 = btoa(binary);
    return fontDataBase64;
  } catch (error) {
    console.warn('Failed to load font data:', error);
    return null;
  }
}

/**
 * 浏览器渲染模式检测
 *
 * 核心规则（按"稳定上线优先"原则）：
 * 1. iOS（iPhone/iPad/iPod + iPadOS 伪装成 Mac）→ 'native'
 * 2. macOS Safari → 'native'
 * 3. Desktop Chrome/Edge → 'fallback'
 * 4. Android Chrome/Edge → 'fallback'
 * 5. 其他无法判断 → 'native'（安全默认）
 *
 * 注意：iOS 上所有浏览器（Safari/Chrome iOS/Edge iOS/Firefox iOS）底层都是 WebKit，
 * 与 Safari 一样不会对 SVG <text> 元素的蒙古文 OpenType 做 shaping，
 * 因此 iOS 一律走 native rendering，与具体浏览器无关。
 */
export function getMongolianRenderMode(): 'native' | 'fallback' {
  // SSR / 任何没有 window/navigator 的环境 → 'native'（最安全）
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'native';
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // iOS 检测：iPad/iPhone/iPod 直接检测 + iPadOS 伪装成 MacIntel 但有触摸点
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && maxTouchPoints > 1);

  // Safari 检测：必须排除所有其他浏览器的 UA 标识
  // （Chrome/Firefox/Edge 在 UA 中都会包含 "Safari"，需要排除）
  const isSafari =
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS|Android/i.test(ua);

  // macOS Safari
  const isMacSafari = isSafari && /Macintosh|Mac OS X/i.test(ua);

  // Android 检测
  const isAndroid = /Android/i.test(ua);

  // Desktop Chrome / Edge（Windows/macOS/Linux 的 Chromium 浏览器）
  const isDesktopChromeOrEdge =
    !isIOS &&
    !isAndroid &&
    /Chrome|Chromium|Edg/i.test(ua) &&
    !/OPR|Opera/i.test(ua);

  // Android Chrome / Edge（移动端 Chromium）
  const isAndroidChromeOrEdge = isAndroid && /Chrome|Chromium|EdgA/i.test(ua);

  // 规则 1+2：iOS 或 macOS Safari → native
  if (isIOS || isMacSafari) return 'native';

  // 规则 3+4：Desktop Chrome/Edge 或 Android Chrome/Edge → fallback
  if (isDesktopChromeOrEdge || isAndroidChromeOrEdge) return 'fallback';

  // 规则 5：其他（Firefox/Opera/未知浏览器）→ native（安全默认）
  return 'native';
}

/**
 * 加载 NotoSansMongolian 字体到 document.fonts
 * （仅在 SVG fallback 模式下使用）
 */
async function loadMongolianFont(): Promise<void> {
  if (fontLoaded) return;
  
  if (!fontLoadPromise) {
    fontLoadPromise = new Promise(async (resolve) => {
      try {
        // 使用 arrayBuffer 方式创建 FontFace，比 url() 字符串更可靠
        const response = await fetch('/fonts/NotoSansMongolian-Regular.ttf');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const font = new FontFace(
          'NotoSansMongolian',
          arrayBuffer
        );
        
        await font.load();
        document.fonts.add(font);
        fontLoaded = true;
        resolve();
      } catch (error) {
        console.warn('Failed to load Mongolian font:', error);
        fontLoaded = true;
        resolve();
      }
    });
  }
  
  return fontLoadPromise;
}

/**
 * 渲染蒙古文为 SVG
 * 
 * 关键：必须整段文本渲染，不能拆分字符！
 * 使用嵌入字体的 SVG data URL，不依赖浏览器原生蒙古文支持。
 * 
 * @param text 蒙古文文本（必须是完整的整段文本）
 * @param options 渲染选项
 * @returns SVG data URL
 */
export async function renderMongolianToSVG(
  text: string, 
  options: RenderOptions
): Promise<RenderResult> {
  if (!text || !text.trim()) {
    return { svgDataUrl: '', inlineSvg: '', width: 0, height: 0 };
  }

  // 缓存键
  const cacheKey = `${text}-${options.mode}-${options.bold || false}-${options.fontSize || 'default'}`;
  const cached = renderCache.get(cacheKey);
  if (cached) return cached;

  // 确保字体已加载
  await loadMongolianFont();

  const config = options.mode === 'vertical' 
    ? RENDER_CONFIG.vertical 
    : RENDER_CONFIG.horizontal;
  
  const fontSize = options.fontSize || config.fontSize;
  const isVertical = options.mode === 'vertical';
  const fontWeight = options.bold ? 'bold' : 'normal';

  // 使用 Canvas 测量文本尺寸
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { svgDataUrl: '', inlineSvg: '', width: 0, height: 0 };
  }

  // 设置字体
  ctx.font = `${fontWeight} ${fontSize}px NotoSansMongolian, Mongolian Baiti, Menk Qagan Higitte, sans-serif`;
  
  // 测量整段文本的尺寸
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize * 1.4;

  // 计算容器尺寸
  let width: number, height: number;
  if (isVertical) {
    // 竖排：宽度是文字高度，高度是文字宽度 + 边距
    width = Math.max(textHeight + 20, 70);
    height = Math.max(textWidth + 40, 80);
  } else {
    // 横排
    width = Math.max(textWidth + 40, 100);
    height = Math.max(textHeight + 20, 60);
  }

  // 创建 SVG（整段渲染，不拆分字符！）
  // 使用 unicodeToBase64 而非 btoa，确保蒙古文 Unicode 正确编码
  const svgString = createSVG(text, {
    width,
    height,
    fontSize,
    fontWeight,
    isVertical,
  });

  const result: RenderResult = {
    svgDataUrl: `data:image/svg+xml;base64,${unicodeToBase64(svgString)}`,
    inlineSvg: svgString,
    width,
    height,
  };

  // 存入缓存（限制缓存大小）
  if (renderCache.size > 100) {
    const firstKey = renderCache.keys().next().value;
    if (firstKey) renderCache.delete(firstKey);
  }
  renderCache.set(cacheKey, result);

  return result;
}

/**
 * 创建带嵌入字体的 SVG 字符串
 *
 * 关键约束（避免影响 Safari 原生 shaping）：
 * - 整段文本渲染，绝不拆分
 * - 不使用 transform/rotate/textLength/dominant-baseline/alignment-baseline
 * - letter-spacing 设为 0
 * - 不修改蒙古文 writing-mode（让 SVG 引擎自行处理）
 *
 * @param text 蒙古文文本（必须是完整的整段文本）
 */
function createSVG(
  text: string,
  options: {
    width: number;
    height: number;
    fontSize: number;
    fontWeight: string;
    isVertical: boolean;
  }
): string {
  const { width, height, fontSize, fontWeight, isVertical } = options;

  // 整段文本渲染，不拆分！这样才能保证蒙古文连写正常
  const textContent = escapeXml(text);

  // 嵌入字体声明（如果字体数据可用）
  const fontFaceDeclarations = getFontFaceDeclarations();

  // 字体栈：优先使用嵌入字体（MongolianFallback），回退到系统字体
  const fontFamily = "'MongolianFallback', 'NotoSansMongolian', 'Mongolian Baiti', sans-serif";

  // 竖排时让浏览器自己决定 writing-mode，水平时使用 horizontal-tb
  // 不强制 writing-mode 避免与 iOS Safari 的 WebKit shaping 冲突
  const writingModeCSS = isVertical
    ? 'writing-mode:vertical-rl;-webkit-writing-mode:vertical-rl;text-orientation:mixed;'
    : 'writing-mode:horizontal-tb;-webkit-writing-mode:horizontal-tb;';

  // 内联样式 - 不使用 transform/rotate/textLength/dominant-baseline
  const inlineStyle =
    `font-family:${fontFamily};font-size:${fontSize}px;font-weight:${fontWeight};` +
    `fill:currentColor;${writingModeCSS}` +
    `letter-spacing:0;white-space:nowrap;`;

  // 嵌入字体的 @font-face 块
  const fontFaceBlock = fontFaceDeclarations
    ? `<style type="text/css"><![CDATA[${fontFaceDeclarations}]]></style>`
    : '';

  // 整段 <text> 元素，不带 dominant-baseline/alignment-baseline
  const textElement =
    `<text x="50%" y="50%" ` +
    `text-anchor="middle" ` +
    `style="${inlineStyle}" ` +
    `lang="mn-Mong" xml:lang="mn-Mong">` +
    `${textContent}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `role="img" aria-label="${textContent}">` +
    `${fontFaceBlock}${textElement}</svg>`;
}

/**
 * XML 特殊字符转义
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 检测浏览器是否支持蒙古文渲染
 * 
 * 返回 true 表示原生渲染可以正常工作
 * 返回 false 表示需要使用 SVG fallback
 */
export function detectMongolianSupport(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 如果字体没有加载完成，默认不支持
  if (!fontLoaded) {
    return false;
  }
  
  // 检测浏览器是否支持蒙古文的 OpenType 特性
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // 使用 NotoSansMongolian 字体测试
  ctx.font = '48px NotoSansMongolian, Mongolian Baiti, Menk Qagan Higitte, sans-serif';
  
  // 测试蒙古文单词（包含连写特性的字符）
  const testWord = 'ᠮᠣᠩᠭᠣᠯ'; // "mongghol" 蒙古
  
  const metrics = ctx.measureText(testWord);
  
  // 如果宽度太小，可能是字体没有正确加载
  if (metrics.width < 50) {
    return false;
  }

  // 基于用户代理的简单检测
  const ua = navigator.userAgent;
  const isWindows = /Windows NT/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edge/i.test(ua);
  const isFirefox = /Firefox/i.test(ua);
  
  // Safari (包括 iOS) 和 Firefox 通常支持较好
  const isSafari = /Safari/i.test(navigator.vendor || '') && !/Chrome/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(ua);
  
  if (isSafari || isFirefox) {
    return true;
  }
  
  // Windows Chrome 和 Android Chrome 不支持蒙古文连写
  if ((isChrome && isWindows) || isAndroid) {
    return false;
  }
  
  // 其他情况默认支持
  return true;
}

/**
 * 预加载蒙古文字体
 */
export async function preloadMongolianFont(): Promise<void> {
  await loadMongolianFont();
}

/**
 * 清除渲染缓存
 */
export function clearRenderCache(): void {
  renderCache.clear();
}

/**
 * 检查字体是否已加载
 */
export function isFontLoaded(): boolean {
  return fontLoaded;
}
