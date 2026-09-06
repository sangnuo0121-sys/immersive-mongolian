'use client';

/**
 * 蒙古装饰 SVG 组件集
 *
 *  1. TulagaStrip  —— 盘肠回纹（顶部装饰条）
 *  2. HanaFrame    —— 哈那骨架（左右菱形格边框）
 *  3. GerCrown     —— 蒙古包穹顶（详情 Dialog 顶部）
 *  4. CloudDivider —— 蒙古云纹（卡片底部/分隔线）
 *  5. Seals        —— 印章（关闭/确认按钮）
 *  6. TypeIcons    —— 类型图标（萨满月 / 风马旗 / 盘肠结 / 萨满鼓）
 *  7. FeltTexture  —— 奶白毡毯纹理（CSS 背景层叠）
 *
 *  所有装饰均为纯 inline SVG，可独立配色。
 */

import { type CSSProperties, type ReactNode } from 'react';
import { MONGOLIAN_BASE, type MongolianType } from '@/lib/mongolian-colors';

// ============================================================================
// 1. 盘肠回纹 (Tulaga)
// ============================================================================

interface TulagaStripProps {
  color?: string;
  softColor?: string;
  height?: number;
  className?: string;
  fill?: boolean;
}

/** 横向盘肠回纹（可用于卡片顶部） */
export function TulagaStrip({
  color = MONGOLIAN_BASE.goldThread,
  softColor = MONGOLIAN_BASE.feltWhiteDeep,
  height = 14,
  className = '',
}: TulagaStripProps) {
  // 用 path 拼一组连续回字纹
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="tulaga-pattern" x="0" y="0" width="20" height="14" patternUnits="userSpaceOnUse">
          {/* 主回字纹 */}
          <path
            d="M 4 7 L 4 3 L 8 3 L 8 5 L 6 5 L 6 9 L 8 9 L 8 11 L 4 11 L 4 7 Z M 12 7 L 12 3 L 16 3 L 16 5 L 14 5 L 14 9 L 16 9 L 16 11 L 12 11 L 12 7 Z M 18 5 L 20 5 L 20 9 L 18 9"
            fill={color}
            fillRule="evenodd"
          />
          {/* 装饰小点 */}
          <circle cx="2" cy="7" r="0.8" fill={softColor} />
          <circle cx="10" cy="7" r="0.6" fill={color} opacity="0.6" />
        </pattern>
      </defs>
      <rect width="200" height="14" fill="url(#tulaga-pattern)" />
    </svg>
  );
}

// ============================================================================
// 2. 哈那骨架 (Hana Skeleton) - 菱形格
// ============================================================================

interface HanaFrameProps {
  side: 'left' | 'right' | 'both';
  color?: string;
  softColor?: string;
  className?: string;
}

/** 左右侧哈那骨架装饰条 */
export function HanaFrame({
  side,
  color = MONGOLIAN_BASE.gerWood,
  softColor = MONGOLIAN_BASE.gerWoodSoft,
  className = '',
}: HanaFrameProps) {
  const width = 14;
  return (
    <>
      {side === 'left' || side === 'both' ? (
        <svg
          viewBox="0 0 14 200"
          preserveAspectRatio="none"
          className={`block ${className}`}
          style={{ width }}
          aria-hidden="true"
        >
          <defs>
            <pattern id={`hana-pattern-left-${side}`} x="0" y="0" width="14" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 7 2 L 13 6 L 7 10 L 1 6 Z"
                fill="none"
                stroke={color}
                strokeWidth="0.8"
                opacity="0.7"
              />
              <path
                d="M 7 10 L 13 14 L 7 18 L 1 14 Z"
                fill="none"
                stroke={softColor}
                strokeWidth="0.8"
                opacity="0.5"
              />
              <circle cx="7" cy="6" r="0.8" fill={color} opacity="0.6" />
              <circle cx="7" cy="14" r="0.8" fill={softColor} opacity="0.5" />
            </pattern>
          </defs>
          <rect width="14" height="200" fill="url(#hana-pattern-left-${side})" />
        </svg>
      ) : null}
      {side === 'right' || side === 'both' ? (
        <svg
          viewBox="0 0 14 200"
          preserveAspectRatio="none"
          className={`block ${className}`}
          style={{ width }}
          aria-hidden="true"
        >
          <defs>
            <pattern id={`hana-pattern-right-${side}`} x="0" y="0" width="14" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 7 2 L 13 6 L 7 10 L 1 6 Z"
                fill="none"
                stroke={color}
                strokeWidth="0.8"
                opacity="0.7"
              />
              <path
                d="M 7 10 L 13 14 L 7 18 L 1 14 Z"
                fill="none"
                stroke={softColor}
                strokeWidth="0.8"
                opacity="0.5"
              />
              <circle cx="7" cy="6" r="0.8" fill={color} opacity="0.6" />
              <circle cx="7" cy="14" r="0.8" fill={softColor} opacity="0.5" />
            </pattern>
          </defs>
          <rect width="14" height="200" fill="url(#hana-pattern-right-${side})" />
        </svg>
      ) : null}
    </>
  );
}

// ============================================================================
// 3. 蒙古包穹顶 (Ger Crown)
// ============================================================================

interface GerCrownProps {
  color?: string;
  softColor?: string;
  className?: string;
}

/** 蒙古包穹顶 SVG（用于 Dialog 顶部） */
export function GerCrown({
  color = MONGOLIAN_BASE.gerWood,
  softColor = MONGOLIAN_BASE.gerWoodSoft,
  className = '',
}: GerCrownProps) {
  return (
    <svg
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      className={`block w-full ${className}`}
      style={{ height: 40 }}
      aria-hidden="true"
    >
      {/* 穹顶外弧 */}
      <path
        d="M 0 40 Q 100 -10 200 40"
        fill={softColor}
        opacity="0.25"
      />
      {/* 哈那骨架条纹 */}
      {Array.from({ length: 9 }).map((_, i) => {
        const x = 10 + i * 22.5;
        return (
          <line
            key={i}
            x1={x}
            y1="40"
            x2={100}
            y2="6"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.4"
          />
        );
      })}
      {/* 顶部图拉嘎 */}
      <circle cx="100" cy="6" r="4" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="100" cy="6" r="2" fill={color} opacity="0.6" />
      {/* 底部细线 */}
      <line x1="0" y1="40" x2="200" y2="40" stroke={color} strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

// ============================================================================
// 4. 蒙古云纹 (Cloud Divider)
// ============================================================================

interface CloudDividerProps {
  color?: string;
  className?: string;
  height?: number;
}

/** 横向蒙古云纹（细线） */
export function CloudDivider({
  color = MONGOLIAN_BASE.gerWoodSoft,
  className = '',
  height = 18,
}: CloudDividerProps) {
  return (
    <svg
      viewBox="0 0 200 18"
      preserveAspectRatio="xMidYMid meet"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <g fill="none" stroke={color} strokeWidth="0.7" opacity="0.55">
        {/* 左旋云 */}
        <path d="M 8 9 Q 12 4 16 9 Q 20 14 24 9" />
        <path d="M 24 9 Q 28 5 32 9 Q 36 13 40 9" />
        {/* 中部对称卷草 */}
        <path d="M 50 9 Q 55 4 60 9 Q 65 14 70 9 Q 75 4 80 9 Q 85 14 90 9 Q 95 4 100 9" />
        {/* 右旋云 */}
        <path d="M 110 9 Q 114 4 118 9 Q 122 14 126 9" />
        <path d="M 130 9 Q 134 4 138 9 Q 142 14 146 9" />
        <path d="M 152 9 Q 156 4 160 9 Q 164 14 168 9 Q 172 4 176 9" />
        {/* 左右端点圆点 */}
        <circle cx="4" cy="9" r="1" fill={color} />
        <circle cx="196" cy="9" r="1" fill={color} />
      </g>
    </svg>
  );
}

// ============================================================================
// 5. 印章 (Seal)
// ============================================================================

interface SealProps {
  text?: string;
  size?: number;
  color?: string;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

/** 圆形蒙古印章（关闭按钮 / 确认按钮） */
export function Seal({
  text = '晓',
  size = 36,
  color = '#A02F2F',
  className = '',
  onClick,
  ariaLabel,
}: SealProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`
        relative inline-flex items-center justify-center
        rounded-full
        bg-[#A02F2F] text-[#F5EFE3]
        border-2 border-[#7A1F1F]
        font-serif font-bold
        shadow-[0_2px_0_rgba(122,31,31,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)]
        hover:shadow-[0_3px_0_rgba(122,31,31,0.7),inset_0_1px_3px_rgba(255,255,255,0.3)]
        hover:-translate-y-[1px]
        active:translate-y-[1px] active:shadow-[0_1px_0_rgba(122,31,31,0.6)]
        transition-all duration-150
        ${className}
      `}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: color,
      }}
    >
      <span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%)',
        }}
      />
      <span className="relative z-10">{text}</span>
    </button>
  );
}

// ============================================================================
// 6. 类型图标 (Type Icons)
// ============================================================================

interface TypeIconProps {
  type: MongolianType;
  size?: number;
  className?: string;
  color?: string;
  softColor?: string;
}

/** 类型图标 - 萨满月 (info) / 风马旗 (warning) / 盘肠结 (success) / 萨满鼓 (update) */
export function TypeIcon({
  type,
  size = 18,
  className = '',
  color,
  softColor,
}: TypeIconProps) {
  const c = color || MONGOLIAN_BASE.gerWood;
  const s = softColor || MONGOLIAN_BASE.goldThread;

  if (type === 'info') {
    // 萨满月 - 圆月
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" fill={c} opacity="0.85" />
        <circle cx="14" cy="10" r="1.2" fill={s} opacity="0.4" />
        <circle cx="9" cy="14" r="0.8" fill={s} opacity="0.3" />
        <path
          d="M 12 2 L 12 4 M 12 20 L 12 22 M 2 12 L 4 12 M 20 12 L 22 12"
          stroke={c}
          strokeWidth="0.8"
          opacity="0.5"
        />
      </svg>
    );
  }

  if (type === 'warning') {
    // 风马旗 - 三角旗
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      >
        <line x1="4" y1="3" x2="4" y2="22" stroke={c} strokeWidth="1.2" />
        <path
          d="M 4 4 L 14 7 L 18 5 L 14 9 L 4 8 Z"
          fill={c}
          opacity="0.85"
        />
        <path
          d="M 4 11 L 12 14 L 15 12 L 12 15 L 4 14 Z"
          fill={s}
          opacity="0.7"
        />
        <path
          d="M 4 17 L 10 19 L 12 18 L 10 20 L 4 19 Z"
          fill={c}
          opacity="0.65"
        />
      </svg>
    );
  }

  if (type === 'success') {
    // 盘肠结 - 简化盘肠
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        aria-hidden="true"
      >
        <path
          d="M 5 5 L 9 5 L 9 9 L 7 9 L 7 7 L 7 7 Q 5 7 5 9 L 5 15 Q 5 17 7 17 L 7 15 L 9 15 L 9 19 L 5 19 L 5 17 Q 3 17 3 15 L 3 9 Q 3 7 5 5 Z M 15 5 L 19 5 Q 21 7 21 9 L 21 15 Q 21 17 19 17 L 19 19 L 15 19 L 15 15 L 17 15 L 17 17 Q 19 17 19 15 L 19 9 Q 19 7 17 7 L 17 9 L 15 9 L 15 5 Z M 9 11 L 15 11 L 15 13 L 9 13 Z"
          fill={c}
          fillRule="evenodd"
          opacity="0.85"
        />
      </svg>
    );
  }

  // update - 萨满鼓
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="12" rx="8" ry="8" fill={c} opacity="0.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke={c} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill={c} opacity="0.85" />
      <line x1="12" y1="3" x2="12" y2="6" stroke={c} strokeWidth="1.2" />
      <line x1="12" y1="18" x2="12" y2="21" stroke={c} strokeWidth="1.2" />
      <line x1="3" y1="12" x2="6" y2="12" stroke={c} strokeWidth="1.2" />
      <line x1="18" y1="12" x2="21" y2="12" stroke={c} strokeWidth="1.2" />
      <circle cx="12" cy="12" r="0.8" fill={s} />
    </svg>
  );
}

// ============================================================================
// 7. 奶白毡毯纹理 (Felt Texture)
// ============================================================================

interface FeltTextureProps {
  className?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

/** 毡毯纹理背景包装（用 SVG noise + 斜线条纹） */
export function FeltTexture({ className = '', children, style }: FeltTextureProps) {
  return (
    <div className={`relative ${className}`} style={style}>
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 3px,
              rgba(122, 90, 61, 0.04) 3px,
              rgba(122, 90, 61, 0.04) 4px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 5px,
              rgba(201, 162, 74, 0.03) 5px,
              rgba(201, 162, 74, 0.03) 6px
            )
          `,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(245, 239, 227, 0.6), transparent 70%)',
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

// ============================================================================
// 8. 标题装饰 - 图拉嘎头
// ============================================================================

interface TulagaHeaderProps {
  size?: number;
  color?: string;
  className?: string;
}

/** 图拉嘎盘肠头（标题左侧装饰） */
export function TulagaHeader({
  size = 24,
  color = MONGOLIAN_BASE.goldThread,
  className = '',
}: TulagaHeaderProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* 外圈 */}
      <circle cx="16" cy="16" r="14" fill="none" stroke={color} strokeWidth="1" opacity="0.4" />
      {/* 内盘肠 */}
      <path
        d="M 16 6 L 20 6 L 20 10 L 18 10 L 18 8 Q 14 8 14 12 L 14 14 L 12 14 L 12 18 L 14 18 L 14 20 Q 14 24 18 24 L 18 22 L 20 22 L 20 26 L 16 26 L 16 24 Q 12 24 12 20 L 12 18 L 10 18 L 10 14 L 12 14 L 12 12 Q 12 8 16 8 L 16 6 Z M 22 10 L 24 10 L 24 14 L 22 14 L 22 10 Z M 22 18 L 24 18 L 24 22 L 22 22 L 22 18 Z"
        fill={color}
        fillRule="evenodd"
        opacity="0.85"
      />
      <circle cx="16" cy="16" r="2" fill={color} />
    </svg>
  );
}

// ============================================================================
// 9. 蒙古包侧影 (Ger Silhouette) - 可选背景装饰
// ============================================================================

interface GerSilhouetteProps {
  className?: string;
  color?: string;
  opacity?: number;
}

/** 蒙古包侧影 - 用于空状态装饰 */
export function GerSilhouette({
  className = '',
  color = MONGOLIAN_BASE.gerWood,
  opacity = 0.1,
}: GerSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* 主体圆顶 */}
      <path
        d="M 30 110 Q 100 20 170 110 Z"
        fill={color}
      />
      {/* 顶部烟囱口 */}
      <rect x="95" y="14" width="10" height="8" fill={color} />
      {/* 哈那竖纹 */}
      {Array.from({ length: 7 }).map((_, i) => {
        const x = 50 + i * 18;
        const y = 110 - (90 - Math.abs(100 - x) * 1.5);
        return (
          <line
            key={i}
            x1={x}
            y1={y}
            x2={x}
            y2="110"
            stroke="#F5EFE3"
            strokeWidth="0.6"
            opacity="0.6"
          />
        );
      })}
      {/* 门 */}
      <path
        d="M 92 110 L 92 78 Q 100 72 108 78 L 108 110 Z"
        fill="#F5EFE3"
        opacity="0.8"
      />
      {/* 地面 */}
      <line x1="10" y1="110" x2="190" y2="110" stroke={color} strokeWidth="1.5" />
      {/* 拴马桩 + 旗 */}
      <line x1="20" y1="110" x2="20" y2="80" stroke={color} strokeWidth="1" />
      <path
        d="M 20 80 L 32 84 L 28 86 L 20 84 Z"
        fill={color}
      />
    </svg>
  );
}

// ============================================================================
// CSS Animations（注入到 globals.css 或 style 标签）
// ============================================================================

export const MONGOLIAN_ANIMATION_CSS = `
@keyframes wind-flag-sway {
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
}

@keyframes tulaga-breathe {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

@keyframes felt-shimmer {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 100%; }
}

.mongolian-flag-sway {
  animation: wind-flag-sway 4s ease-in-out infinite;
  transform-origin: 50% 100%;
}

.mongolian-tulaga-breathe {
  animation: tulaga-breathe 3s ease-in-out infinite;
}

.mongolian-felt {
  background:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 3px,
      rgba(122, 90, 61, 0.05) 3px,
      rgba(122, 90, 61, 0.05) 4px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(201, 162, 74, 0.04) 5px,
      rgba(201, 162, 74, 0.04) 6px
    );
}
`;

export const FONT_SERIF_STACK =
  '"Noto Serif SC", "Songti SC", "STSong", "SimSun", serif';
