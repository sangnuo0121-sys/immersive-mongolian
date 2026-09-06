'use client';

import { useEffect, useState } from 'react';
import { getMongolianRenderMode } from '@/lib/mongolian-renderer';
import {
  MongolianText,
  NativeMongolianText,
  SvgMongolianFallback,
  type MongolianRenderMode,
} from '@/components/common/MongolianText';

// 测试用蒙古文词条（包含各种连写、组合字符）
const TEST_WORDS: Array<{ mn: string; zh: string; en: string; note?: string }> = [
  { mn: 'ᠮᠣᠩᠭᠣᠯ', zh: '蒙古', en: 'Mongol', note: '含词中变写 (ᠭ→ᠭᠣ)' },
  { mn: 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ', zh: '你好', en: 'Hello' },
  { mn: 'ᠪᠠᠢᠭᠠᠯᠢᠭ', zh: '你好', en: 'Hello (口语)' },
  { mn: 'ᠲᠦᠯᠦᠭᠡᠷᠡᠨ', zh: '支持', en: 'support' },
  { mn: 'ᠡᠵᠢᠨ ᠬᠤᠭᠵᠢᠨ', zh: '主人/雇主', en: 'master/employer' },
  { mn: 'ᠨᠡᠭ ᠦᠭᠡᠢ ᠲᠠᠯᠠ', zh: '一个国家', en: 'one country' },
  { mn: 'ᠪᠤᠷᠢᠯ᠎ᠠ', zh: '再见', en: 'goodbye' },
];

export default function MongolianRenderTestPage() {
  const [renderMode, setRenderMode] = useState<MongolianRenderMode | null>(null);
  const [userAgent, setUserAgent] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');
  const [maxTouchPoints, setMaxTouchPoints] = useState<number>(0);

  useEffect(() => {
    setRenderMode(getMongolianRenderMode());
    setUserAgent(navigator.userAgent);
    setPlatform(navigator.platform || '');
    setMaxTouchPoints(navigator.maxTouchPoints || 0);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-rose-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 text-3xl font-bold text-slate-800">
          蒙古文渲染测试 / Mongolian Render Test
        </h1>
        <p className="mb-6 text-slate-600">
          本页面用于在 <strong>iOS / macOS Safari / Chrome / Edge / Android</strong> 上验证蒙古文连写显示。
        </p>

        {/* 检测信息 */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">📡 浏览器检测结果</h2>
          <div className="space-y-1 font-mono text-sm">
            <div>
              <span className="inline-block w-40 text-slate-500">renderMode:</span>
              <span
                className={`font-bold ${
                  renderMode === 'native'
                    ? 'text-emerald-600'
                    : renderMode === 'svg'
                    ? 'text-amber-600'
                    : 'text-slate-400'
                }`}
              >
                {renderMode === null
                  ? '检测中...'
                  : renderMode === 'native'
                  ? '✅ native (Safari / iOS)'
                  : '⚙️ svg (Chrome / Edge / Android)'}
              </span>
            </div>
            <div>
              <span className="inline-block w-40 text-slate-500">platform:</span>
              <span className="text-slate-800">{platform}</span>
            </div>
            <div>
              <span className="inline-block w-40 text-slate-500">maxTouchPoints:</span>
              <span className="text-slate-800">{maxTouchPoints}</span>
            </div>
            <div>
              <span className="inline-block w-40 text-slate-500">userAgent:</span>
              <span className="break-all text-xs text-slate-800">{userAgent}</span>
            </div>
          </div>
        </section>

        {/* Native 模式（Safari / iOS 应当用此模式） */}
        <section className="mb-8 rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-emerald-700">
            ✅ 模式 1: Native HTML/CSS（Safari / iOS 应当走这个）
          </h2>
          <p className="mb-4 text-sm text-emerald-600">
            直接使用 <code className="rounded bg-emerald-100 px-1">writing-mode: vertical-lr</code> +{' '}
            <code className="rounded bg-emerald-100 px-1">text-orientation: sideways</code>，
            让系统 <strong>Mongolian Baiti</strong> 字体 + WebKit shaping 引擎处理连写。
          </p>
          <div className="space-y-4">
            {TEST_WORDS.map((w, i) => (
              <div
                key={`native-${i}`}
                className="flex flex-wrap items-center gap-4 border-b border-emerald-100 pb-3 last:border-0"
              >
                <div className="flex h-32 w-24 items-center justify-center rounded bg-white shadow-inner">
                  <NativeMongolianText mode="vertical" size="xl" bold>
                    {w.mn}
                  </NativeMongolianText>
                </div>
                <div className="flex-1 text-sm text-slate-700">
                  <div className="font-semibold text-slate-800">
                    {w.zh} / {w.en}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {w.mn}
                  </div>
                  {w.note && (
                    <div className="mt-1 text-xs italic text-amber-600">
                      💡 {w.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SVG 模式（Chrome / Edge / Android） */}
        <section className="mb-8 rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-amber-700">
            ⚙️ 模式 2: SVG fallback（Chrome / Edge / Android 应当走这个）
          </h2>
          <p className="mb-4 text-sm text-amber-600">
            使用嵌入字体的内联 SVG（绕过 Chrome 缺乏蒙古文 OpenType shaping 的问题）。
          </p>
          <div className="space-y-4">
            {TEST_WORDS.map((w, i) => (
              <div
                key={`svg-${i}`}
                className="flex flex-wrap items-center gap-4 border-b border-amber-100 pb-3 last:border-0"
              >
                <div className="flex h-32 w-24 items-center justify-center rounded bg-white shadow-inner">
                  <SvgMongolianFallback mode="vertical" size="xl" bold>
                    {w.mn}
                  </SvgMongolianFallback>
                </div>
                <div className="flex-1 text-sm text-slate-700">
                  <div className="font-semibold text-slate-800">
                    {w.zh} / {w.en}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {w.mn}
                  </div>
                  {w.note && (
                    <div className="mt-1 text-xs italic text-amber-600">
                      💡 {w.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dispatcher（MongolianText） */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-700">
            🎯 模式 3: MongolianText 调度器（生产环境使用）
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            根据当前浏览器自动选择 native 或 svg 模式。下方为生产组件的实际渲染。
          </p>
          <div className="space-y-4">
            {TEST_WORDS.map((w, i) => (
              <div
                key={`dispatcher-${i}`}
                className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-3 last:border-0"
              >
                <div className="flex h-32 w-24 items-center justify-center rounded bg-slate-50 shadow-inner">
                  <MongolianText mode="vertical" size="xl" bold>
                    {w.mn}
                  </MongolianText>
                </div>
                <div className="flex-1 text-sm text-slate-700">
                  <div className="font-semibold text-slate-800">
                    {w.zh} / {w.en}
                  </div>
                  <div className="font-mono text-xs text-slate-500">
                    {w.mn}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 横排测试 */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-slate-700">
            ↔️ 横排模式对照
          </h2>
          <div className="space-y-3">
            {TEST_WORDS.slice(0, 4).map((w, i) => (
              <div
                key={`h-${i}`}
                className="flex flex-wrap items-center gap-4 rounded border border-slate-100 p-2"
              >
                <NativeMongolianText mode="horizontal" size="md">
                  {w.mn}
                </NativeMongolianText>
                <span className="text-sm text-slate-500">|</span>
                <span className="text-sm text-slate-700">
                  {w.zh} / {w.en}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 验收清单 */}
        <section className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-700">✅ 验收清单</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li>📱 <strong>iOS Safari</strong>: renderMode = native，字符连贯、无重叠</li>
            <li>💻 <strong>macOS Safari</strong>: renderMode = native，字符连贯、无重叠</li>
            <li>🖥️ <strong>Chrome 桌面</strong>: renderMode = svg，字符连贯、无重叠</li>
            <li>🤖 <strong>Android Chrome</strong>: renderMode = svg，字符连贯、无重叠</li>
            <li>🌐 <strong>Firefox</strong>: renderMode = svg（仍然可用，因 SVG 嵌入字体）</li>
            <li>🔍 <strong>Edge</strong>: renderMode = svg</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
