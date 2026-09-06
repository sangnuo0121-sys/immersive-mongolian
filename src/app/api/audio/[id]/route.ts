import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';

const BUCKET_NAME = 'word-audio';

// PATCH /api/audio/[id] — admin 修改音频标签（official ↔ community）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Audio record ID is required' },
        { status: 400 }
      );
    }

    // 必须登录 + admin
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    if (session.profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: '需要管理员权限 / Admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { label } = body || {};
    if (label !== 'official' && label !== 'community') {
      return NextResponse.json(
        { success: false, error: 'label 必须是 official 或 community' },
        { status: 400 }
      );
    }

    const client = getClient(session.accessToken);
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }

    const { data, error } = await client
      .from('audio_records')
      .update({ label })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        label: data.label,
        upvotes: data.upvotes,
        downvotes: data.downvotes,
      },
    });
  } catch (error: any) {
    console.error('Audio PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// 删除音频记录 — admin 可删任意，普通用户只能删自己上传的
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Audio record ID is required' },
        { status: 400 }
      );
    }

    // 必须登录才能删除
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }

    const isAdmin = session.profile?.role === 'admin';
    const userId = session.user.id;

    const client = getClient(session.accessToken);
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }

    // 先获取音频记录以检查归属 + 获取 storage 路径
    const { data: record, error: getError } = await client
      .from('audio_records')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (getError) {
      console.error('Failed to get audio record:', getError);
      return NextResponse.json(
        { success: false, error: `Failed to get record: ${getError.message}` },
        { status: 500 }
      );
    }

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Audio record not found' },
        { status: 404 }
      );
    }

    // 权限检查：admin 可删任意，普通用户只能删自己上传的
    if (!isAdmin && record.created_by_user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '只能删除自己上传的音频 / You can only delete your own audio' },
        { status: 403 }
      );
    }

    // 从 storage 删除文件
    const audioUrl = record.audio_url;
    let storageDeleteSuccess = true;
    
    if (audioUrl && audioUrl.includes('/storage/v1/object/public/')) {
      const urlParts = audioUrl.split('/storage/v1/object/public/');
      if (urlParts.length === 2) {
        const storagePath = urlParts[1];
        const { error: storageError } = await client.storage.from(BUCKET_NAME).remove([storagePath]);
        if (storageError) {
          console.error('Failed to delete storage file:', storageError);
          storageDeleteSuccess = false;
        } else {
          console.log('Storage file deleted:', storagePath);
        }
      }
    }

    // 从数据库删除记录
    const { error: deleteError } = await client
      .from('audio_records')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete database record:', deleteError);
      return NextResponse.json(
        { success: false, error: `Failed to delete record: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log('Audio deleted successfully:', {
      id,
      deletedBy: userId,
      storageDeleted: storageDeleteSuccess
    });

    return NextResponse.json({
      success: true,
      storageDeleted: storageDeleteSuccess
    });
  } catch (error: any) {
    console.error('Audio delete error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
