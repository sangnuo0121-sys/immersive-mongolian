'use client';

/**
 * 蒙古文化装饰元素库
 *
 * 全部为内联 SVG / CSS 装饰，可直接作为 React 节点嵌入。
 * 设计原则：极简线条 + 草原色系，避免过度堆砌装饰。
 */

import { useId } from 'react';

// ============= 1. 远山天际线（Home 背景） =============
export function MountainHorizon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      className={className}
      aria-hidden
    >
      {/* 远山 - 雪山白 */}
      <path
        d="M0,200 L0,140 L120,90 L200,120 L280,80 L360,110 L440,70 L540,100 L640,75 L740,105 L840,80 L940,110 L1040,85 L1140,115 L1200,95 L1200,200 Z"
        fill="rgba(248,250,252,0.55)"
      />
      {/* 中山 - 雪青 */}
      <path
        d="M0,200 L0,170 L100,140 L220,160 L340,130 L460,155 L580,135 L700,160 L820,140 L940,165 L1060,145 L1200,165 L1200,200 Z"
        fill="rgba(165,180,252,0.45)"
      />
      {/* 近山 - 草原绿 */}
      <path
        d="M0,200 L0,185 L150,170 L320,180 L480,165 L640,178 L800,168 L960,180 L1120,170 L1200,182 L1200,200 Z"
        fill="rgba(16,185,129,0.55)"
      />
    </svg>
  );
}

// ============= 2. 蒙古包轮廓（Yurt Silhouette） =============
export function YurtSilhouette({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={className} aria-hidden>
      {/* 顶部天窗 + 烟囱 */}
      <rect x="47" y="6" width="6" height="10" fill="currentColor" />
      {/* 圆顶 */}
      <path
        d="M30,40 Q30,18 50,18 Q70,18 70,40 Z"
        fill="currentColor"
      />
      {/* 毡帐主体 */}
      <path
        d="M22,40 L78,40 L72,72 L28,72 Z"
        fill="currentColor"
      />
      {/* 门 */}
      <rect x="44" y="50" width="12" height="22" fill="rgba(255,255,255,0.5)" />
      {/* 毡帐纹（3 条横线） */}
      <line x1="28" y1="48" x2="72" y2="48" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="30" y1="56" x2="70" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1="32" y1="64" x2="68" y2="64" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    </svg>
  );
}

// ============= 3. 哈达飘带（5 色） =============
export function KhataRibbon({ className = '' }: { className?: string }) {
  // 5 色：蓝（天空） / 白（乳汁） / 红（火焰） / 绿（草原） / 黄（金）
  const colors = [
    'bg-sky-400/80',
    'bg-white/80',
    'bg-rose-400/80',
    'bg-emerald-400/80',
    'bg-amber-400/80',
  ];
  return (
    <div className={`flex gap-0.5 ${className}`} aria-hidden>
      {colors.map((c, i) => (
        <div
          key={i}
          className={`${c} h-1 flex-1 rounded-full`}
        />
      ))}
    </div>
  );
}

// ============= 4. 云纹（Olzai 简笔） =============
export function CloudPattern({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 40" className={className} aria-hidden>
      <path
        d="M0,20 Q15,5 30,20 Q45,35 60,20 Q75,5 90,20 Q105,35 120,20 Q135,5 150,20 Q165,35 180,20 Q195,5 210,20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ============= 5. 萨满鼓 (Shaman Drum) =============
export function ShamanDrum({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {/* 鼓面 */}
      <circle cx="32" cy="34" r="22" fill="currentColor" />
      {/* 鼓心 */}
      <circle cx="32" cy="34" r="6" fill="rgba(255,255,255,0.4)" />
      {/* 鼓槌 */}
      <rect
        x="30"
        y="2"
        width="4"
        height="20"
        rx="1"
        fill="currentColor"
        transform="rotate(20 32 12)"
      />
      {/* 鼓钉 8 颗 */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const x = 32 + Math.cos(angle) * 18;
        const y = 34 + Math.sin(angle) * 18;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="rgba(0,0,0,0.3)" />;
      })}
    </svg>
  );
}

// ============= 6. 马头琴 (Morin Khuur) =============
export function MorinKhuur({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 40" className={className} aria-hidden>
      {/* 琴箱（梯形） */}
      <path
        d="M8,8 L32,8 L36,32 L12,32 Z"
        fill="currentColor"
      />
      {/* 琴箱顶角 */}
      <circle cx="36" cy="8" r="3" fill="currentColor" />
      {/* 琴杆 */}
      <rect x="36" y="6" width="38" height="2" fill="currentColor" />
      {/* 琴头（马头简笔） */}
      <circle cx="76" cy="6" r="2.5" fill="currentColor" />
      <path d="M76,6 L78,2 L80,4 L79,8" fill="currentColor" />
      {/* 弦 */}
      <line x1="36" y1="10" x2="74" y2="8" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <line x1="36" y1="12" x2="74" y2="10" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
    </svg>
  );
}

// ============= 7. 苍狼图腾 (简化符号) =============
export function WolfTotem({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      {/* 狼头轮廓 */}
      <path
        d="M30,8 L18,20 L20,30 L14,40 L24,38 L26,52 L34,52 L36,38 L46,40 L40,30 L42,20 Z"
        fill="currentColor"
      />
      {/* 双耳 */}
      <path d="M22,12 L18,4 L26,10 Z" fill="currentColor" />
      <path d="M38,12 L42,4 L34,10 Z" fill="currentColor" />
      {/* 双目 */}
      <circle cx="26" cy="24" r="1.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="34" cy="24" r="1.5" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

// ============= 8. 草原道路进度条 =============
export function SteppeProgress({
  percent,
  className = '',
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={`relative h-3 rounded-full overflow-hidden ${className}`}>
      {/* 背景 = 天空渐变 */}
      <div className="absolute inset-0 bg-gradient-to-r from-sky-200 via-stone-200 to-emerald-200" />
      {/* 进度 = 草原绿渐变 + 高度小一些 */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
      {/* 远山剪影（小） */}
      <svg
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-30"
        aria-hidden
      >
        <path
          d="M0,12 L0,8 L20,3 L40,7 L60,2 L80,6 L100,1 L120,5 L140,2 L160,6 L180,3 L200,7 L200,12 Z"
          fill="rgba(255,255,255,0.5)"
        />
      </svg>
    </div>
  );
}

// ============= 9. 羊皮卷轴（左右卷轴条） =============
export function ScrollFrame({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* 左卷轴条 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 rounded-l-md shadow-inner"
        aria-hidden
      >
        <div className="absolute inset-y-3 left-1/2 w-px bg-amber-900/40 -translate-x-1/2" />
      </div>
      {/* 右卷轴条 */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 rounded-r-md shadow-inner"
        aria-hidden
      >
        <div className="absolute inset-y-3 left-1/2 w-px bg-amber-900/40 -translate-x-1/2" />
      </div>
      {/* 羊皮纸内容 */}
      <div className="relative mx-3 bg-gradient-to-br from-stone-50 via-amber-50/60 to-stone-100">
        {children}
      </div>
    </div>
  );
}

// ============= 10. 篝火（完成动画） =============
export function Bonfire({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 80" className={className} aria-hidden>
      {/* 火焰外层 */}
      <path
        d="M30,5 Q15,30 22,55 Q30,75 38,55 Q45,30 30,5 Z"
        fill="currentColor"
        className="text-orange-500 opacity-80 animate-pulse"
      />
      {/* 火焰中层 */}
      <path
        d="M30,20 Q22,38 26,55 Q30,68 34,55 Q38,38 30,20 Z"
        fill="currentColor"
        className="text-amber-400"
      />
      {/* 火焰内层 */}
      <path
        d="M30,30 Q27,42 28,55 Q30,62 32,55 Q33,42 30,30 Z"
        fill="currentColor"
        className="text-yellow-300"
      />
      {/* 柴火 */}
      <rect x="18" y="68" width="24" height="3" rx="1" fill="currentColor" className="text-amber-900" />
      <rect x="14" y="72" width="32" height="3" rx="1" fill="currentColor" className="text-amber-800" transform="rotate(-3 30 73)" />
      <rect x="16" y="76" width="28" height="3" rx="1" fill="currentColor" className="text-amber-900" transform="rotate(2 30 77)" />
    </svg>
  );
}

// ============= 11. 站号徽章（"路线第 N 站"） =============
export function StationBadge({
  n,
  className = '',
}: {
  n: number;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md ring-2 ring-amber-100 ${className}`}
    >
      {n}
    </div>
  );
}

// ============= 12. 蒙古文竖排小水印 =============
export function MongolianVerticalWatermark({
  text,
  className = '',
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        writingMode: 'vertical-rl',
        fontFeatureSettings: '"liga" off',
      }}
      aria-hidden
    >
      {text}
    </div>
  );
}

// 草原天际线（与 MountainHorizon 同形，更适合水平铺开）
export function SteppeHorizon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full ${className}`}
      viewBox="0 0 1200 80"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* 远山（双层） */}
      <path
        d="M0,55 L80,30 L160,50 L240,28 L320,48 L400,32 L480,50 L560,28 L640,46 L720,30 L800,48 L880,32 L960,52 L1040,34 L1120,50 L1200,38 L1200,80 L0,80 Z"
        fill="#94a3b8"
        opacity="0.5"
      />
      <path
        d="M0,65 L120,48 L220,62 L320,46 L420,60 L520,44 L620,58 L720,42 L820,56 L920,40 L1020,54 L1120,42 L1200,52 L1200,80 L0,80 Z"
        fill="#64748b"
        opacity="0.7"
      />
    </svg>
  );
}

// 成吉思汗令牌火苗（简化符号）
export function SoyomboFlame({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      {/* 火焰外层 */}
      <path
        d="M12 2C10 6 8 7 8 11C8 13 9 14 10 14C9 12 10 10 12 8C14 10 15 12 14 14C15 14 16 13 16 11C16 7 14 6 12 2Z"
        fill="currentColor"
        opacity="0.85"
      />
      {/* 火焰内层 */}
      <path
        d="M12 7C11 9 10 10 10 12C10 13 10.5 13.5 11 13.5C10.7 12.5 11 11.5 12 10.5C13 11.5 13.3 12.5 13 13.5C13.5 13.5 14 13 14 12C14 10 13 9 12 7Z"
        fill="#fef3c7"
      />
      {/* 火苗底座 */}
      <ellipse cx="12" cy="20" rx="3" ry="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// 那达慕圆环（套马杆风格的圆环）
export function NaadamRing({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}
