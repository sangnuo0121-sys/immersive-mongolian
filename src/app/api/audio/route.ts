import { NextRequest, NextResponse } from 'next/server';
import { getClient, getSupabaseCredentials } from '@/storage/database/supabase-client';
import { getSession } from '@/lib/auth/session';

const BUCKET_NAME = 'word-audio';

// 注意：不再使用 ensureBucketExists 预检。
// 原因：Supabase Storage 的 listBuckets/createBucket 可能被 RLS 拒绝，
// 即使 bucket 实际存在也会返回 false，导致上传被误拦。
// 改为直接上传，如果 bucket 不存在，upload 本身会返回明确错误。

// 上传音频到 Supabase Storage 并创建 audio_records 记录（所有用户可上传）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const wordId = formData.get('wordId') as string;
    const audioName = (formData.get('audioName') as string) || 'Audio';

    // 上传会产生公开内容，必须使用已验证的登录身份。
    const session = await getSession(request);
    if (!session.ok) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status });
    }
    const effectiveCreatedByUserId = session.user.id;
    const effectiveCreatedByName = session.profile?.display_name || session.user.email;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided', step: 'validation' },
        { status: 400 }
      );
    }

    if (!wordId) {
      return NextResponse.json(
        { success: false, error: 'Word ID is required', step: 'validation' },
        { status: 400 }
      );
    }

    // 验证文件类型 - 宽松验证，只检查是否是音频类型
    const isAudioType = file.type.startsWith('audio/');
    // 兼容不同浏览器返回的不同 MIME type 格式
    const validAudioPatterns = [
      /^audio\//,
      /mp3|mpeg$/i,
      /wav$/i,
      /mp4|m4a|aac$/i,
      /ogg|webm|opus$/i,
    ];
    const isValidAudio = isAudioType || validAudioPatterns.some(p => p.test(file.type)) || validAudioPatterns.some(p => p.test(file.name));
    
    if (!isValidAudio) {
      console.error('Invalid file type:', file.type, 'File name:', file.name);
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Please upload an audio file.`, step: 'validation' },
        { status: 400 }
      );
    }

    const client = getClient(session.accessToken);
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available', step: 'init' },
        { status: 503 }
      );
    }

    // 直接上传，不预检 bucket（避免 listBuckets/createBucket RLS 误拦）

    // 生成唯一文件名
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 9);
    const fileExtension = file.name.split('.').pop() || 'webm';
    const fileName = `${wordId}/${timestamp}-${randomStr}.${fileExtension}`;

    // 将 File 转换为 ArrayBuffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error('Failed to convert file to buffer:', bufferError);
      return NextResponse.json(
        { success: false, error: 'Failed to read file data', step: 'file_read' },
        { status: 500 }
      );
    }

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}`, step: 'storage_upload' },
        { status: 500 }
      );
    }

    // 获取公开访问 URL
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // 创建 audio_records 记录（包含音频名称 + label 默认 community）
    const { data: recordData, error: recordError } = await client
      .from('audio_records')
      .insert({
        word_id: wordId,
        audio_url: audioUrl,
        audio_name: audioName,
        created_by_user_id: effectiveCreatedByUserId,
        created_by_name: effectiveCreatedByName,
        label: 'community',
        upvotes: 0,
        downvotes: 0,
      })
      .select()
      .single();

    if (recordError) {
      console.error('Database insert error:', recordError);
      // 如果数据库插入失败，尝试删除已上传的文件
      await client.storage.from(BUCKET_NAME).remove([fileName]);
      return NextResponse.json(
        { success: false, error: `Database insert failed: ${recordError.message}`, step: 'database_insert' },
        { status: 500 }
      );
    }

    console.log('Audio uploaded successfully:', {
      id: recordData.id,
      wordId: recordData.word_id,
      audioName: recordData.audio_name,
      audioUrl: recordData.audio_url,
      label: recordData.label,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: recordData.id,
        wordId: recordData.word_id,
        audioUrl: recordData.audio_url,
        audioName: recordData.audio_name,
        createdByUserId: recordData.created_by_user_id,
        createdByName: recordData.created_by_name,
        createdAt: recordData.created_at,
        label: recordData.label || 'community',
        upvotes: recordData.upvotes || 0,
        downvotes: recordData.downvotes || 0,
      },
    });
  } catch (error: any) {
    console.error('Audio upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error', step: 'unknown' },
      { status: 500 }
    );
  }
}

// 获取词条的所有音频记录，或所有音频记录（用于初始化）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wordId = searchParams.get('wordId');

    const client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }

    let query = client
      .from('audio_records')
      .select('*')
      .order('label', { ascending: true })  // community < official (字母序 c < o)；但用下面的二级排序保证 official 在前
      .order('created_at', { ascending: false }); // 新→旧（同等 label 内）

    // 如果提供了 wordId，则只获取该词条的音频
    if (wordId) {
      query = query.eq('word_id', wordId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 转换数据格式（含 label / votes / 名称 fallback）
    // 排序规则：官方（official）在前，社区（community）在后；同 label 内按 votes.score = up - down 倒序
    const audioRecords = (data || []).map((record: any) => ({
      id: record.id,
      wordId: record.word_id,
      audioUrl: record.audio_url,
      audioName: record.audio_name || record.audioName || '',
      createdByUserId: record.created_by_user_id,
      createdByName: record.created_by_name,
      createdAt: record.created_at,
      label: record.label || 'community',
      upvotes: typeof record.upvotes === 'number' ? record.upvotes : 0,
      downvotes: typeof record.downvotes === 'number' ? record.downvotes : 0,
    }));

    return NextResponse.json({
      success: true,
      data: audioRecords,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
