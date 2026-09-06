import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database';

const ORAL_BUCKET = 'oral-archives-audio';
const ALLOWED_BUCKETS = new Set([ORAL_BUCKET, 'word-audio']);
const ALLOWED_HOST_SUFFIXES = ['.supabase.co', '.supabase.com', '.supabase.net', '.volces.com'];

function isAllowedAudioUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === 'https:' && ALLOWED_HOST_SUFFIXES.some(suffix => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

// 音频格式 MIME 映射表
const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  flac: 'audio/flac',
  'x-m4a': 'audio/mp4',
};

function detectMimeType(filePath: string, fallback: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext && MIME_MAP[ext]) {
    return MIME_MAP[ext];
  }
  return fallback;
}

/**
 * 音频代理路由
 * 
 * 将 Supabase Storage 的跨域音频通过同源 API 代理，
 * 避免浏览器因 CORS / 跨域证书问题阻止音频加载（尤其 Safari）。
 * 
 * 用法:
 *   /api/audio/proxy?key=xxx&bucket=oral-archives-audio
 *   /api/audio/proxy?url=https://... (直接代理已有 URL)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const url = searchParams.get('url');
    const bucket = searchParams.get('bucket') || ORAL_BUCKET;

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: 'Invalid storage bucket' }, { status: 403 });
    }

    // 1. 直接代理已有 URL（兼容已有数据）
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      if (!isAllowedAudioUrl(decodedUrl)) {
        return NextResponse.json({ error: 'Invalid URL domain' }, { status: 403 });
      }
      const response = await fetch(decodedUrl);
      if (!response.ok) {
        console.error('[AudioProxy] Upstream error:', response.status, 'for URL:', decodedUrl.slice(0, 80));
        throw new Error(`Upstream ${response.status}`);
      }
      const upstreamType = response.headers.get('Content-Type') || '';
      const detectedType = detectMimeType(decodedUrl, upstreamType || 'audio/mpeg');
      return new Response(response.body, {
        headers: {
          'Content-Type': detectedType,
          'Content-Length': response.headers.get('Content-Length') || '',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 2. 从 Storage 获取（通过 key）- 仅使用 getPublicUrl，避免 RPC 依赖
    if (key) {
      const client = getClient();
      const decodedKey = decodeURIComponent(key);
      const { data: publicData } = client.storage.from(bucket).getPublicUrl(decodedKey);
      
      if (!publicData?.publicUrl) {
        throw new Error('Failed to resolve audio URL');
      }

      console.log('[AudioProxy] Fetching from:', publicData.publicUrl.slice(0, 80));
      const response = await fetch(publicData.publicUrl);
      
      if (!response.ok) {
        console.error('[AudioProxy] Upstream error:', response.status, 'for key:', decodedKey);
        throw new Error(`Upstream ${response.status}`);
      }

      return new Response(response.body, {
        headers: {
          'Content-Type': detectMimeType(decodedKey, response.headers.get('Content-Type') || 'audio/mpeg'),
          'Content-Length': response.headers.get('Content-Length') || '',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return NextResponse.json({ error: 'Missing key or url parameter' }, { status: 400 });
  } catch (error: any) {
    console.error('[AudioProxy] Error:', error.message);
    return NextResponse.json({ error: 'Failed to proxy audio' }, { status: 502 });
  }
}
