'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

/**
 * VisitorCounter - 极简访问统计组件
 *
 * 功能说明：
 * - 统计累计访问人数（Total Visitors），数据存储在 Supabase，所有设备同步
 * - 每次访问首页时自动递增计数
 * - 不收集 IP、UA、地理位置等任何个人信息
 */
export function VisitorCounter() {
  const { t } = useApp();
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 先递增计数（同步到 Supabase）
        const postRes = await fetch('/api/visitors', { method: 'POST' });
        const postData = await postRes.json();
        if (cancelled) return;

        if (typeof postData.totalVisitors === 'number') {
          setTotalVisitors(postData.totalVisitors);
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        // 递增失败时尝试只读取当前值
        try {
          const res = await fetch('/api/visitors');
          const data = await res.json();
          if (!cancelled && typeof data.totalVisitors === 'number') {
            setTotalVisitors(data.totalVisitors);
          }
        } catch {
          // 静默失败
        }
        console.warn('[VisitorCounter] API request failed:', err);
        setError(true);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  // 加载中
  if (loading) {
    return (
      <Card className="border-emerald-100 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">{t('正在加载社区数据...', 'Loading community impact...')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 请求失败时隐藏卡片
  if (error) {
    return null;
  }

  return (
    <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-1">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-emerald-800 mb-1">
              {t('社区影响', 'Community Impact')}
            </h3>

            {/* Core metric */}
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-3xl font-bold text-emerald-700 tabular-nums">
                {totalVisitors?.toLocaleString() ?? '—'}
              </span>
              <span className="text-sm text-emerald-600 font-medium">
                {t('累计访问', 'Total Visitors')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}