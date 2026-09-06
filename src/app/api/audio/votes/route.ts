import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';

// GET /api/audio/votes?audioIds=a1,a2,a3
// 返回 { votes: { [audioId]: 'up' | 'down' } } — 当前用户对每个 audioId 的投票情况
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const audioIdsParam = searchParams.get('audioIds') || '';
    const audioIds = audioIdsParam.split(',').map(s => s.trim()).filter(Boolean);
    if (audioIds.length === 0) {
      return NextResponse.json({ success: true, votes: {} });
    }

    const client = getClient(session.accessToken);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Database service not available' }, { status: 503 });
    }

    const { data, error } = await client
      .from('audio_votes')
      .select('audio_id, vote_type')
      .eq('user_id', userId)
      .in('audio_id', audioIds);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const votes: Record<string, 'up' | 'down'> = {};
    for (const row of (data || [])) {
      votes[row.audio_id] = row.vote_type;
    }
    return NextResponse.json({ success: true, votes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/audio/votes — 投票 / 取消投票 / 切换投票
// body: { audioId, voteType: 'up' | 'down' | null }
//  - voteType = 'up' / 'down'：写入 audio_votes + 累加 audio_records.upvotes/downvotes
//  - voteType = null：删除投票 + 减少对应计数
//  - 同 user 重复投同 type：取消（删除该 vote，反向减计数）
//  - 同 user 投不同 type：先减旧计数再加新计数
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    const userId = session.user.id;

    const body = await request.json();
    const { audioId, voteType } = body || {};
    if (!audioId) {
      return NextResponse.json({ success: false, error: 'audioId is required' }, { status: 400 });
    }
    if (voteType !== null && voteType !== 'up' && voteType !== 'down') {
      return NextResponse.json({ success: false, error: "voteType 必须是 'up' / 'down' / null" }, { status: 400 });
    }

    const client = getClient(session.accessToken);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Database service not available' }, { status: 503 });
    }

    // 1. 查询当前用户对该 audio 已有投票
    const { data: existing, error: existingErr } = await client
      .from('audio_votes')
      .select('vote_type')
      .eq('user_id', userId)
      .eq('audio_id', audioId)
      .maybeSingle();

    if (existingErr) {
      return NextResponse.json({ success: false, error: existingErr.message }, { status: 500 });
    }

    const oldVote = existing?.vote_type as 'up' | 'down' | undefined;

    // 2. 计算需要调整的 audio_records 计数
    let upDelta = 0;
    let downDelta = 0;

    // 2a. 反向撤销 oldVote
    if (oldVote === 'up') upDelta -= 1;
    else if (oldVote === 'down') downDelta -= 1;

    // 2b. 应用新 vote
    if (voteType === 'up') upDelta += 1;
    else if (voteType === 'down') downDelta += 1;

    // 3. 更新 audio_votes 表（upsert / delete）
    if (voteType === null) {
      // 取消投票
      if (oldVote) {
        const { error: delErr } = await client
          .from('audio_votes')
          .delete()
          .eq('user_id', userId)
          .eq('audio_id', audioId);
        if (delErr) {
          return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
        }
      }
    } else {
      // upsert 投票（约束名是 audio_votes_unique，但 supabase-js upsert 用列名匹配）
      const { error: upsertErr } = await client
        .from('audio_votes')
        .upsert({ user_id: userId, audio_id: audioId, vote_type: voteType }, { onConflict: 'audio_id,user_id' });
      if (upsertErr) {
        return NextResponse.json({ success: false, error: upsertErr.message }, { status: 500 });
      }
    }

    // 4. 总是读取 current 计数（无论 delta 是否为 0），用于返回
    const { data: current, error: readErr } = await client
      .from('audio_records')
      .select('upvotes, downvotes')
      .eq('id', audioId)
      .single();
    if (readErr) {
      return NextResponse.json({ success: false, error: readErr.message }, { status: 500 });
    }
    const newUp = Math.max(0, (current.upvotes || 0) + upDelta);
    const newDown = Math.max(0, (current.downvotes || 0) + downDelta);

    // 5. 只在 delta 非 0 时才更新计数（避免空 update）
    if (upDelta !== 0 || downDelta !== 0) {
      const { error: updErr } = await client
        .from('audio_records')
        .update({ upvotes: newUp, downvotes: newDown })
        .eq('id', audioId);
      if (updErr) {
        return NextResponse.json({ success: false, error: updErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        audioId,
        voteType: voteType,
        upvotes: newUp,
        downvotes: newDown,
      },
    });
  } catch (error: any) {
    console.error('Audio vote error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
