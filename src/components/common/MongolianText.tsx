'use client';

/**
 * 蒙古文渲染入口
 *
 * 当前策略：所有平台统一使用 SvgMongolianFallback（SVG）。
 * 优势：跨平台完全一致，无 Safari / Chrome 差异，无系统字体差异。
 *
 * 关键规则：
 * 1. SSR/首屏：直接输出 SvgMongolianFallback
 * 2. 整段文本渲染，绝不 split / Array.from / [...text] / 逐字符包裹
 * 3. 保留原始 Unicode 控制字符：FVS1/FVS2/FVS3/MVS/NNBSP
 * 4. 不使用 transform / rotate / letter-spacing / textLength / dominant-baseline / alignment-baseline
 *
 * 调用方如需强制 native，可在调用处显式使用 <MongolianTextNative />；
 * 强制 SVG 可用 <MongolianTextSVG /> 或 fallbackMode="svg-only"。
 */

import {
  forwardRef,
  HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  renderMongolianToSVG,
  preloadMongolianFont,
} from '@/lib/mongolian-renderer';

// ============================================================
// 类型定义
// ============================================================

export type MongolianRenderMode = 'native' | 'svg' | 'fallback';
export type FallbackMode = 'auto' | 'native-only' | 'svg-only';

const SIZE_CONFIG = {
  sm: { px: 18 },
  md: { px: 24 },
  lg: { px: 30 },
  xl: { px: 36 },
} as const;

interface MongolianTextBaseProps {
  children: React.ReactNode;
  /** 排版模式：vertical (竖排，传统蒙古文) 或 horizontal (横排) */
  mode?: 'vertical' | 'horizontal';
  /** 文字大小 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** 是否加粗 */
  bold?: boolean;
  className?: string;
}

// ============================================================
// NativeMongolianText —— 整段原生 HTML 渲染
// ------------------------------------------------------------
// 用于 Safari / iOS / macOS Safari / 其他无法可靠使用 SVG 的环境
//
// 严格遵守的样式（inline style，不依赖任何全局 class）：
//   - display: inline-block
//   - writing-mode: vertical-lr + text-orientation: sideways
//   - font-family: "Mongolian Baiti", "Noto Sans Mongolian", serif
//   - letter-spacing: 0, word-spacing: normal, line-height: 1.8
//   - white-space: nowrap, overflow: visible
//   - direction: ltr, unicode-bidi: isolate
//   - font-weight: 400
//
// 关键约束：
// - 整段文本直接作为 {children} 渲染，禁用任何 split/Array.from/[...text]
// - 保留所有 FVS1/FVS2/FVS3/MVS/NNBSP 控制字符
// - 不做 normalize / sanitize / replace 控制字符
// ============================================================

type NativeMongolianTextProps = MongolianTextBaseProps &
  Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    /** 是否强制设置 font-family。默认 true。false 时使用 inherit（系统默认字体优先） */
    forceFontFamily?: boolean;
  };

export const NativeMongolianText = forwardRef<
  HTMLSpanElement,
  NativeMongolianTextProps
>(function NativeMongolianText(
  {
    children,
    mode = 'vertical',
    size = 'md',
    bold = false,
    className = '',
    forceFontFamily = true,
    style,
    ...props
  },
  ref,
) {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const isVertical = mode === 'vertical';

  // font-family：
  // - forceFontFamily=true：显式设置 "Mongolian Baiti", "Noto Sans Mongolian", serif
  // - forceFontFamily=false：让浏览器使用系统默认字体（避免强制干扰）
  const fontFamilyValue = forceFontFamily
    ? '"Mongolian Baiti", "Noto Sans Mongolian", serif'
    : 'inherit';

  const nativeStyle: React.CSSProperties = {
    display: 'inline-block',
    writingMode: isVertical ? 'vertical-lr' : 'horizontal-tb',
    WebkitWritingMode: isVertical ? 'vertical-lr' : 'horizontal-tb',
    textOrientation: isVertical ? 'sideways' : 'mixed',
    WebkitTextOrientation: isVertical ? 'sideways' : 'mixed',
    fontFamily: fontFamilyValue,
    fontWeight: bold ? 'bold' : 400,
    fontStyle: 'normal',
    fontVariantLigatures: 'normal',
    letterSpacing: 0,
    wordSpacing: 'normal',
    lineHeight: 1.8,
    whiteSpace: 'nowrap',
    overflow: 'visible',
    direction: 'ltr',
    unicodeBidi: 'isolate',
    fontSize: `${sizeConfig.px}px`,
    // 允许外部 style 覆盖（但不能破坏整段渲染）
    ...(style || {}),
  };

  return (
    <span
      ref={ref}
      className={`mongolian-native-root ${className}`}
      lang="mn-Mong"
      style={nativeStyle}
      {...props}
    >
      {children}
    </span>
  );
});

// ============================================================
// SvgMongolianFallback —— 仅用于 Chrome / Edge / Android
// ------------------------------------------------------------
// 通过内联 SVG 嵌入字体绕过 Chrome 缺乏蒙古文 OpenType shaping 的问题
//
// 关键约束：
// - 整段 <text> 渲染，绝不拆分字符
// - 不使用 transform / rotate / textLength / dominant-baseline / alignment-baseline
// - 使用独立 class mongolian-fallback-root，不影响 native
// - 失败时（如 font load 失败 / 渲染异常）回退到 native，不强制 SVG
// ============================================================

type SvgFallbackProps = MongolianTextBaseProps &
  Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
    showOriginalText?: boolean;
  };

export const SvgMongolianFallback = forwardRef<
  HTMLSpanElement,
  SvgFallbackProps
>(function SvgMongolianFallback(
  {
    children,
    mode = 'vertical',
    size = 'md',
    bold = false,
    className = '',
    showOriginalText = true,
    style,
    ...props
  },
  ref,
) {
  // 提取文本（绝不拆分、不 normalize、不 replace 控制字符）
  const text = useMemo(() => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    return '';
  }, [children]);

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const isVertical = mode === 'vertical';

  const [inlineSvg, setInlineSvg] = useState<string | null>(null);
  const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [fontReady, setFontReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const mountedRef = useRef(true);
  const lastRenderKeyRef = useRef<string>('');

  // 1. 预加载字体
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        await preloadMongolianFont();
      } catch {
        // 字体加载失败也继续（让 SVG 走系统字体 fallback）
      }
      if (!cancelled) setFontReady(true);
    })();
    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  // 2. 字体就绪后渲染 SVG
  useEffect(() => {
    if (!fontReady || !text) return;
    const renderKey = `${text}|${mode}|${bold}|${sizeConfig.px}`;
    if (lastRenderKeyRef.current === renderKey) return;
    lastRenderKeyRef.current = renderKey;
    setHasFailed(false);

    let cancelled = false;
    (async () => {
      try {
        const result = await renderMongolianToSVG(text, {
          mode,
          bold,
          fontSize: sizeConfig.px,
        });
        if (cancelled || !mountedRef.current) return;
        if (result?.inlineSvg) {
          setInlineSvg(result.inlineSvg);
          setSvgSize({ width: result.width, height: result.height });
        } else {
          setHasFailed(true);
        }
      } catch {
        if (!cancelled && mountedRef.current) setHasFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, mode, bold, sizeConfig.px, fontReady]);

  // 失败回退：直接渲染 native
  if (hasFailed) {
    return (
      <NativeMongolianText
        ref={ref}
        mode={mode}
        size={size}
        bold={bold}
        className={className}
        style={style}
        {...props}
      >
        {children}
      </NativeMongolianText>
    );
  }

  // SVG 就绪
  if (inlineSvg) {
    const containerStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'visible',
      ...(isVertical
        ? {
            width: Math.max(svgSize.width, 40) + 24,
            height: Math.max(svgSize.height, 60),
            paddingLeft: '12px',
            paddingRight: '12px',
          }
        : {
            width: Math.max(svgSize.width, 60),
            height: Math.max(svgSize.height, 30) + 16,
            paddingTop: '8px',
            paddingBottom: '8px',
          }),
      ...(style || {}),
    };
    return (
      <span
        ref={ref}
        className={`mongolian-fallback-root ${className}`}
        lang="mn-Mong"
        style={containerStyle}
        {...props}
      >
        <span
          style={{
            display: 'inline-block',
            width: svgSize.width,
            height: svgSize.height,
            lineHeight: 0,
            overflow: 'visible',
          }}
          dangerouslySetInnerHTML={{ __html: inlineSvg }}
        />
        {showOriginalText && (
          <span className="sr-only" lang="mn-Mong">
            {children}
          </span>
        )}
      </span>
    );
  }

  // 加载中：占位（保持布局，避免抖动）
  const placeholderStyle: React.CSSProperties = {
    display: 'inline-block',
    fontFamily: '"Mongolian Baiti", "Noto Sans Mongolian", serif',
    letterSpacing: 0,
    whiteSpace: 'nowrap',
    lineHeight: 1.6,
    fontSize: `${sizeConfig.px}px`,
    fontWeight: bold ? 'bold' : 400,
    opacity: fontReady ? 0.2 : 0,
    visibility: fontReady ? 'visible' : 'hidden',
    overflow: 'visible',
    ...(isVertical
      ? {
          writingMode: 'vertical-lr',
          WebkitWritingMode: 'vertical-lr',
          textOrientation: 'sideways',
          WebkitTextOrientation: 'sideways',
        }
      : {}),
    ...(style || {}),
  };
  return (
    <span
      ref={ref}
      className={`mongolian-fallback-root mongolian-fallback-placeholder ${className}`}
      lang="mn-Mong"
      style={placeholderStyle}
      aria-hidden={!fontReady ? 'true' : undefined}
      {...props}
    >
      {children}
    </span>
  );
});

// ============================================================
// MongolianText —— 顶层调度器
// ------------------------------------------------------------
// 当前策略：默认走 SVG（所有平台一致）。
// 通过 fallbackMode 覆盖：
//   - 'auto'      : 默认，浏览器检测 → 当前实现等价于 svg-only
//   - 'native-only': 永远 native（用于显式关闭 SVG）
//   - 'svg-only'  : 永远 svg（与 auto 当前一致）
//
// SSR/首屏：直接出 SVG，不再先 native 再切，hydration 期间不会闪烁。
// ============================================================

export interface MongolianTextProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  children: React.ReactNode;
  mode?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bold?: boolean;
  /** 渲染模式控制。默认 'svg-only' —— 所有平台统一 SVG */
  fallbackMode?: FallbackMode;
  className?: string;
}

// ============================================================
// MongolianTextSVG —— 强制 SVG fallback 的快捷组件
// ============================================================
export const MongolianTextSVG = forwardRef<
  HTMLSpanElement,
  Omit<MongolianTextProps, 'fallbackMode'>
>(function MongolianTextSVG(props, ref) {
  return <MongolianText ref={ref} fallbackMode="svg-only" {...props} />;
});

// ============================================================
// MongolianTextNative —— 强制 native 的快捷组件
// ============================================================
export const MongolianTextNative = forwardRef<
  HTMLSpanElement,
  Omit<MongolianTextProps, 'fallbackMode'>
>(function MongolianTextNative(props, ref) {
  return <MongolianText ref={ref} fallbackMode="native-only" {...props} />;
});

export const MongolianText = forwardRef<HTMLSpanElement, MongolianTextProps>(
  function MongolianText(
    {
      children,
      mode = 'vertical',
      size = 'md',
      bold = false,
      fallbackMode = 'svg-only',
      className = '',
      style,
      ...props
    },
    ref,
  ) {
    // 直接根据 fallbackMode 决定 —— SSR 与 CSR 行为一致
    const effectiveMode: MongolianRenderMode =
      fallbackMode === 'native-only' ? 'native' : 'svg';

    if (effectiveMode === 'native') {
      return (
        <NativeMongolianText
          ref={ref}
          mode={mode}
          size={size}
          bold={bold}
          className={className}
          style={style}
          {...props}
        >
          {children}
        </NativeMongolianText>
      );
    }

    return (
      <SvgMongolianFallback
        ref={ref}
        mode={mode}
        size={size}
        bold={bold}
        className={className}
        style={style}
        {...props}
      >
        {children}
      </SvgMongolianFallback>
    );
  },
);
