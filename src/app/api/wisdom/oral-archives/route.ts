import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database';
import { requireAuth, requireOwnerOrAdmin } from "@/lib/auth/require-auth";
import { syncMongolianDisplayForRecord, markOldSvgAsOutdated } from '@/lib/mongolian-display';
import { OralArchive } from '@/types';

const BUCKET_NAME = 'oral-archives-audio';

// 探测 bucket 是否存在（用"上传再删除"探测，避开 listBuckets 的 RLS 限制）
async function probeBucketReady(client: NonNullable<ReturnType<typeof getClient>>): Promise<boolean> {
  // 1. 尝试直接上传一个 1 字节的探针文件
  const probeKey = `__probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const probeBody = new Uint8Array([0]);
  try {
    const { error: upErr } = await client.storage
      .from(BUCKET_NAME)
      .upload(probeKey, probeBody, { contentType: 'application/octet-stream', upsert: false });
    if (!upErr) {
      // 上传成功：bucket 存在，立刻清理探针
      await client.storage.from(BUCKET_NAME).remove([probeKey]);
      return true;
    }
    const msg = String((upErr as any)?.message || '');
    if (/bucket .* not found/i.test(msg) || /not.*found/i.test(msg) || (upErr as any)?.statusCode === '404') {
      // 2. bucket 不存在 → 尝试创建
      const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
      });
      if (createError) {
        console.error('[oral-archives] Failed to create bucket:', createError);
        return false;
      }
      return true;
    }
    // 其它错误（权限等）→ 视为不可用
    console.error('[oral-archives] Probe upload failed:', upErr);
    return false;
  } catch (error) {
    console.error('[oral-archives] Error probing bucket:', error);
    return false;
  }
}

// 将 audio key 转换为公开 URL
function resolveAudioUrl(client: NonNullable<ReturnType<typeof getClient>>, audioKey: string | null): string {
  if (!audioKey) return '';
  // data: URL（base64 降级）直接返回，无需代理
  if (audioKey.startsWith('data:')) {
    return audioKey;
  }
  // 已有 http/https 外部 URL → 通过同源代理，避免跨域（Safari 兼容）
  if (audioKey.startsWith('http://') || audioKey.startsWith('https://')) {
    return `/api/audio/proxy?url=${encodeURIComponent(audioKey)}`;
  }
  // Storage key → 通过同源代理
  return `/api/audio/proxy?key=${encodeURIComponent(audioKey)}&bucket=${BUCKET_NAME}`;
}

// 上传音频到 Storage，返回 audio key
// audioFile: 来自 multipart/form-data 的 File 对象
async function uploadAudioToStorage(
  client: NonNullable<ReturnType<typeof getClient>>,
  audioFile: File,
  archiveId: string
): Promise<string | null> {
  const bucketReady = await probeBucketReady(client);
  if (!bucketReady) {
    console.error('[oral-archives] Storage bucket not available');
    return null;
  }
  try {
    const fileBuffer = Buffer.from(await audioFile.arrayBuffer());

    // 获取原始文件扩展名
    const rawExt = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';

    // 写入临时文件供 ffmpeg 转换
    const tmpInput = `/tmp/audio_in_${archiveId}.${rawExt}`;
    const tmpOutput = `/tmp/audio_out_${archiveId}.mp3`;
    require('fs').writeFileSync(tmpInput, fileBuffer);

    // 使用 ffmpeg 转码为通用 mp3（确保所有浏览器可播放）
    const { execSync } = require('child_process');
    try {
      execSync(
        `ffmpeg -y -i "${tmpInput}" -acodec libmp3lame -ab 128k -ar 44100 -ac 2 "${tmpOutput}" 2>/dev/null`,
        { timeout: 30000 }
      );
    } catch (ffErr) {
      console.error('[oral-archives] ffmpeg transcoding failed, uploading original:', ffErr);
      // 如果转码失败，直接上传原始文件
      require('fs').unlinkSync(tmpInput);
      const fallbackExt = rawExt === 'x-m4a' ? 'm4a' : rawExt;
      const fileName = `${archiveId}_${Date.now()}.${fallbackExt}`;
      const { error: upErr } = await client.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, { contentType: audioFile.type || 'audio/mpeg', upsert: false });
      if (upErr) { console.error('[oral-archives] Fallback upload failed:', upErr); return null; }
      console.log('[oral-archives] Audio uploaded (original):', fileName);
      return fileName;
    }

    // 读取转码后的 mp3
    const mp3Buffer = require('fs').readFileSync(tmpOutput);
    const fileName = `${archiveId}_${Date.now()}.mp3`;

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, mp3Buffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    // 清理临时文件
    try { require('fs').unlinkSync(tmpInput); } catch {}
    try { require('fs').unlinkSync(tmpOutput); } catch {}

    if (uploadError) {
      console.error('[oral-archives] Failed to upload audio:', uploadError);
      return null;
    }

    console.log('[oral-archives] Audio transcoded and uploaded successfully:', fileName);
    return fileName;
  } catch (error) {
    console.error('[oral-archives] Error uploading audio:', error);
    return null;
  }
}

// 删除 Storage 中的音频
async function deleteAudioFromStorage(
  client: NonNullable<ReturnType<typeof getClient>>,
  audioKey: string
): Promise<boolean> {
  if (!audioKey || audioKey.startsWith('http://') || audioKey.startsWith('https://') || audioKey.startsWith('data:')) return true;
  try {
    const { error } = await client.storage.from(BUCKET_NAME).remove([audioKey]);
    if (error) {
      console.error('[oral-archives] Failed to delete audio:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[oral-archives] Error deleting audio:', error);
    return false;
  }
}

// GET - 获取所有声音档案
export async function GET() {
  try {
    const client = getClient();
    const { data, error } = await client
      .from('oral_archives')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // 兜底：表不存在（首次部署 / 还没跑过 SQL）→ 返回空数组而非 500
      const msg = String((error as any)?.message || '');
      if (
        (error as any)?.code === 'PGRST205' ||
        /relation .* does not exist/i.test(msg) ||
        /table .* does not exist/i.test(msg) ||
        /Could not find the table/i.test(msg)
      ) {
        console.warn(
          '[oral-archives] Table oral_archives not found. ' +
            '请在 Supabase Dashboard 跑一次 SUPABASE_FULL_SETUP.sql 8.2 节以创建该表。当前返回空数组。',
        );
        return NextResponse.json({ success: true, data: [] });
      }
      console.error('[oral-archives] GET error:', error);
      return NextResponse.json({ error: '获取声音档案失败' }, { status: 500 });
    }

    const archives: OralArchive[] = (data || []).map((item: any) => ({
      id: item.id,
      title: {
        mn: item.title_mn || '',
        zh: item.title_zh || '',
        en: item.title_en || '',
      },
      description: {
        mn: item.description_mn || '',
        zh: item.description_zh || '',
        en: item.description_en || '',
      },
      audioUrl: resolveAudioUrl(client, item.audio_key || item.audio_url),
      audioKey: item.audio_key || undefined,
      durationSeconds: item.duration_seconds,
      uploaderName: item.uploader_name,
      isUserUploaded: item.is_user_uploaded,
      createdByUserId: item.created_by_user_id || undefined,
      createdAt: new Date(item.created_at).getTime(),
      updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : undefined,
    }));

    return NextResponse.json({ success: true, data: archives });
  } catch (error) {
    console.error('[oral-archives] GET exception:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// POST - 创建新声音档案
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const client = getClient(auth.accessToken);
    console.log('[oral-archives] POST start, parsing formData...');
    const formData = await request.formData();
    console.log('[oral-archives] formData parsed, keys:', Array.from(formData.keys()));

    const titleZh = formData.get('titleZh') as string;
    const titleMn = formData.get('titleMn') as string;
    const titleEn = formData.get('titleEn') as string;
    const descriptionZh = formData.get('descriptionZh') as string;
    const descriptionMn = formData.get('descriptionMn') as string;
    const descriptionEn = formData.get('descriptionEn') as string;
    const uploaderName = formData.get('uploaderName') as string;
    const durationSeconds = formData.get('durationSeconds') ? Number(formData.get('durationSeconds')) : null;
    const audioFile = formData.get('audioFile') as File | null;

    if (!titleZh) {
      return NextResponse.json({ error: '标题为必填项' }, { status: 400 });
    }

    // 先创建记录获取ID
    const { data: insertData, error: insertError } = await client
      .from('oral_archives')
      .insert({
        title_mn: titleMn || null,
        title_zh: titleZh,
        title_en: titleEn || null,
        description_mn: descriptionMn || null,
        description_zh: descriptionZh || null,
        description_en: descriptionEn || null,
        audio_url: null,
        audio_key: null,
        duration_seconds: durationSeconds || null,
        uploader_name: uploaderName || null,
        is_user_uploaded: true,
        created_by_user_id: auth.userId,
        created_by_name: auth.email || 'User',
      })
      .select()
      .single();

    if (insertError || !insertData) {
      console.error('[oral-archives] Insert error:', insertError);
      return NextResponse.json({ error: '创建失败: ' + (insertError?.message || 'unknown') }, { status: 500 });
    }

    console.log('[oral-archives] Inserted record id:', insertData.id, 'hasAudio:', !!audioFile, 'fileSize:', audioFile?.size || 0);

    const archiveId = insertData.id;
    let finalAudioUrl = '';
    let finalAudioKey: string | null = null;

    // 上传音频文件到 Storage（multipart/form-data 直传）
    if (audioFile && audioFile.size > 0) {
      console.log('[oral-archives] Starting audio upload, type:', audioFile.type, 'size (KB):', Math.round(audioFile.size / 1024));
      const uploadedKey = await uploadAudioToStorage(client, audioFile, archiveId);
      console.log('[oral-archives] uploadAudioToStorage returned:', uploadedKey || 'null');
      if (uploadedKey) {
        finalAudioKey = uploadedKey;
        finalAudioUrl = resolveAudioUrl(client, uploadedKey);
        // 更新记录添加 audio_key
        await client.from('oral_archives').update({ audio_key: uploadedKey }).eq('id', archiveId);
        console.log('[oral-archives] Audio stored in storage, key:', uploadedKey, 'url:', finalAudioUrl);
      } else {
        console.error('[oral-archives] Storage upload failed, no fallback available');
      }
    }

    const archive: OralArchive = {
      id: archiveId,
      title: {
        mn: insertData.title_mn || '',
        zh: insertData.title_zh || '',
        en: insertData.title_en || '',
      },
      description: {
        mn: insertData.description_mn || '',
        zh: insertData.description_zh || '',
        en: insertData.description_en || '',
      },
      audioUrl: finalAudioUrl,
      audioKey: finalAudioKey || undefined,
      durationSeconds: insertData.duration_seconds,
      uploaderName: insertData.uploader_name,
      isUserUploaded: insertData.is_user_uploaded,
      createdAt: new Date(insertData.created_at).getTime(),
    };

    // 同步：title_mn / description_mn 入库后生成蒙古文 SVG
    try {
      await syncMongolianDisplayForRecord('oral_archives', archiveId, {
        title_mn: insertData.title_mn,
        description_mn: insertData.description_mn,
      });
    } catch (e) {
      console.warn(
        `[oral-archives POST] sync svg failed for ${archiveId}:`,
        e,
      );
    }

    console.log('[oral-archives] POST success, archiveId:', archiveId);
    return NextResponse.json({ success: true, data: archive });
  } catch (error: any) {
    console.error('[oral-archives] POST exception:', error?.message, error?.stack);
    return NextResponse.json({ error: '服务器错误: ' + (error?.message || 'unknown') }, { status: 500 });
  }
}

// PUT - 更新声音档案
export async function PUT(request: NextRequest) {
  try {
    let client = getClient();
    const formData = await request.formData();

    const id = formData.get('id') as string;

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    // 权限检查：先查 created_by_user_id
    const { data: existing } = await client.from('oral_archives').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existing?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);

    const titleZh = formData.get('titleZh') as string;
    const titleMn = formData.get('titleMn') as string;
    const titleEn = formData.get('titleEn') as string;
    const descriptionZh = formData.get('descriptionZh') as string;
    const descriptionMn = formData.get('descriptionMn') as string;
    const descriptionEn = formData.get('descriptionEn') as string;
    const uploaderName = formData.get('uploaderName') as string;
    const durationSeconds = formData.get('durationSeconds') ? Number(formData.get('durationSeconds')) : null;
    const audioFile = formData.get('audioFile') as File | null;
    const existingAudioKey = formData.get('existingAudioKey') as string;

    const { data: existingRecord, error: fetchError } = await client
      .from('oral_archives')
      .select('audio_key, audio_url')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[oral-archives] Fetch existing record error:', fetchError);
      return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (titleZh !== null) updateData.title_zh = titleZh;
    if (titleMn !== null) updateData.title_mn = titleMn || null;
    if (titleEn !== null) updateData.title_en = titleEn || null;
    if (descriptionZh !== null) updateData.description_zh = descriptionZh || null;
    if (descriptionMn !== null) updateData.description_mn = descriptionMn || null;
    if (descriptionEn !== null) updateData.description_en = descriptionEn || null;
    if (durationSeconds !== null) updateData.duration_seconds = durationSeconds;
    if (uploaderName !== null) updateData.uploader_name = uploaderName || null;

    let newAudioUrl = '';
    let newAudioKey: string | null = null;

    if (audioFile && audioFile.size > 0) {
      // 上传新音频（multipart/form-data 直传）
      const uploadedKey = await uploadAudioToStorage(client, audioFile, id);
      if (uploadedKey) {
        newAudioKey = uploadedKey;
        newAudioUrl = resolveAudioUrl(client, uploadedKey);
        updateData.audio_key = uploadedKey;
        updateData.audio_url = null;
        // 删除旧音频
        if (existingRecord?.audio_key) {
          await deleteAudioFromStorage(client, existingRecord.audio_key);
        }
      } else {
        console.error('[oral-archives] Storage upload failed on PUT');
      }
    } else if (existingAudioKey === '' || existingAudioKey === 'null') {
      if (existingRecord?.audio_key) {
        await deleteAudioFromStorage(client, existingRecord.audio_key);
      }
      updateData.audio_key = null;
      updateData.audio_url = null;
    }

    const { data, error } = await client
      .from('oral_archives')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[oral-archives] Update error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    const archive: OralArchive = {
      id: data.id,
      title: {
        mn: data.title_mn || '',
        zh: data.title_zh || '',
        en: data.title_en || '',
      },
      description: {
        mn: data.description_mn || '',
        zh: data.description_zh || '',
        en: data.description_en || '',
      },
      audioUrl: newAudioUrl || resolveAudioUrl(client, data.audio_key),
      audioKey: data.audio_key || undefined,
      durationSeconds: data.duration_seconds,
      uploaderName: data.uploader_name,
      isUserUploaded: data.is_user_uploaded,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : undefined,
    };

    // 同步：title_mn / description_mn 变化时重新生成蒙古文 SVG
    const mnChanged = titleMn !== null || descriptionMn !== null;
    if (mnChanged) {
      try {
        await syncMongolianDisplayForRecord('oral_archives', id, {
          title_mn: data.title_mn,
          description_mn: data.description_mn,
        });
      } catch (e) {
        console.warn(
          `[oral-archives PUT] sync svg failed for ${id}:`,
          e,
        );
      }
    }

    return NextResponse.json({ success: true, data: archive });
  } catch (error) {
    console.error('[oral-archives] PUT exception:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE - 删除声音档案
export async function DELETE(request: NextRequest) {
  try {
    let client = getClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    // 权限检查：先查 created_by_user_id
    const { data: existingOwner } = await client.from('oral_archives').select('created_by_user_id').eq('id', id).single();
    const auth = await requireOwnerOrAdmin(request, existingOwner?.created_by_user_id);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    client = getClient(auth.accessToken);

    const { data: existingRecord } = await client
      .from('oral_archives')
      .select('audio_key')
      .eq('id', id)
      .single();

    if (existingRecord?.audio_key) {
      await deleteAudioFromStorage(client, existingRecord.audio_key);
    }

    // 同步：删除时清理 SVG 缓存
    try {
      await markOldSvgAsOutdated('oral_archives', id);
    } catch (e) {
      console.warn(
        `[oral-archives DELETE] markOldSvgAsOutdated failed for ${id}:`,
        e,
      );
    }

    const { error } = await client.from('oral_archives').delete().eq('id', id);

    if (error) {
      console.error('[oral-archives] Delete error:', error);
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[oral-archives] Delete exception:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
