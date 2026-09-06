import { NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';

// ─── 自动初始化 ───────────────────────────────────────────────
// 当表不存在时，尝试使用 service_role key 创建表和初始记录
async function ensureSiteMetrics(client: ReturnType<typeof getClient>) {
  const ddlSQL = `
    CREATE TABLE IF NOT EXISTS site_metrics (
      id TEXT PRIMARY KEY,
      total_visitors INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    INSERT INTO site_metrics (id, total_visitors)
    VALUES ('main', 0)
    ON CONFLICT (id) DO NOTHING;
  `;

  // 尝试通过 RPC 执行 DDL（Coze 内置 Supabase 服务端可用）
  const { error: ddlError } = await client.rpc('exec_sql', { query: ddlSQL });
  if (!ddlError) return true;

  // 降级：尝试直接插入（表可能已存在但无 record）
  const { error: insertError } = await client
    .from('site_metrics')
    .insert({ id: 'main', total_visitors: 0 })
    .single();

  return !insertError || (insertError?.code ?? '') !== '42P01';
}

/**
 * GET /api/visitors
 * 读取当前累计访问人数
 */
export async function GET() {
  try {
    const client = getClient();
    const initial = await client
      .from('site_metrics')
      .select('total_visitors')
      .eq('id', 'main')
      .single();
    let data = initial.data;
    const error = initial.error;

    // 表不存在 → 尝试初始化
    if (error && (error.code === '42P01' || error.code === 'PGRST116')) {
      await ensureSiteMetrics(client);
      const { data: retry } = await client
        .from('site_metrics')
        .select('total_visitors')
        .eq('id', 'main')
        .single();
      data = retry;
    }

    return NextResponse.json({ totalVisitors: data?.total_visitors ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Visitors API] GET exception:', message);
    return NextResponse.json({ totalVisitors: 0 }, { status: 200 });
  }
}

/**
 * POST /api/visitors
 * 将 total_visitors +1
 * 支持 RPC 原子递增 + 降级方案
 */
export async function POST() {
  try {
    const client = getClient();

    // 方案一：尝试使用 RPC 原子递增（如果函数存在）
    const { data: rpcResult, error: rpcError } = await client.rpc('increment_visitor');
    if (!rpcError && rpcResult != null) {
      return NextResponse.json({ totalVisitors: rpcResult });
    }

    // RPC 失败 → 方案二：读 + 写
    const { data: current, error: readError } = await client
      .from('site_metrics')
      .select('total_visitors')
      .eq('id', 'main')
      .single();

    // 表不存在 → 尝试初始化
    if (readError && (readError.code === '42P01' || readError.code === 'PGRST116')) {
      const inited = await ensureSiteMetrics(client);
      if (inited) {
        // 初始化成功，直接返回 1（刚创建的记录此时为 0，+1 后为 1）
        const { error: firstUpdate } = await client
          .from('site_metrics')
          .update({ total_visitors: 1, updated_at: new Date().toISOString() })
          .eq('id', 'main');
        if (!firstUpdate) return NextResponse.json({ totalVisitors: 1 });
      }
      // 初始化失败 → 返回 0
      return NextResponse.json({ totalVisitors: 0 }, { status: 200 });
    }

    const newCount = (current?.total_visitors ?? 0) + 1;

    const { error: updateError } = await client
      .from('site_metrics')
      .update({ total_visitors: newCount, updated_at: new Date().toISOString() })
      .eq('id', 'main');

    if (updateError) {
      console.error('[Visitors API] POST write error:', updateError.message);
      return NextResponse.json({ totalVisitors: newCount - 1 }, { status: 200 });
    }

    return NextResponse.json({ totalVisitors: newCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Visitors API] POST exception:', message);
    return NextResponse.json({ totalVisitors: 0 }, { status: 200 });
  }
}
