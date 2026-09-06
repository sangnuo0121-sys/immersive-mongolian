import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAdmin } from '@/lib/auth/require-auth';

const BUCKET_NAME = 'word-audio';

/**
 * 检查 word-audio bucket 是否可用
 * 策略：直接尝试 upload 一个 1 字节探测文件，成功即 bucket 存在且可写
 * 避免 listBuckets/createBucket 的 RLS 误拦问题
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);

    // 探测：upload 1 字节文件到 __probe__/check.txt
    const probePath = '__probe__/check.txt';
    const probeData = new Uint8Array([0x00]);

    const { error: uploadError } = await client.storage
      .from(BUCKET_NAME)
      .upload(probePath, probeData, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      // Bucket 不存在 → 给用户手动创建指引
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('does not exist') || uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json({
          success: false,
          error: `Bucket '${BUCKET_NAME}' does not exist. Please create it in Supabase Dashboard.`,
          bucketReady: false,
          instructions: [
            '1. Go to Supabase Dashboard > Storage',
            `2. Create a new bucket named '${BUCKET_NAME}'`,
            '3. Make it public',
            '4. Set file size limit to 10MB',
          ]
        }, { status: 404 });
      }

      // 其他错误（如 RLS / 权限）→ bucket 存在但可能不可写
      console.error('Bucket probe failed:', uploadError.message);
      return NextResponse.json({
        success: false,
        error: `Bucket probe failed: ${uploadError.message}`,
        bucketReady: false
      }, { status: 500 });
    }

    // 清理探测文件
    await client.storage.from(BUCKET_NAME).remove([probePath]).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Bucket '${BUCKET_NAME}' is ready`,
      bucketReady: true
    });
  } catch (error: any) {
    console.error('Bucket check error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      bucketReady: false
    }, { status: 500 });
  }
}

/**
 * POST：尝试确保 bucket 可用（同 GET 逻辑）
 */
export async function POST(request: NextRequest) {
  const result = await GET(request);
  return result;
}
