import { NextRequest, NextResponse } from 'next/server';
import { getClient, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';
import { requireAdmin } from "@/lib/auth/require-auth";
import { syncMongolianDisplayForRecord, markOldSvgAsOutdated } from '@/lib/mongolian-display';
import type { Acknowledgement } from '@/types';

const BUCKET_NAME = 'acknowledgements-images';

// 确保 storage bucket 存在
async function ensureBucketExists(client: NonNullable<ReturnType<typeof getClient>>): Promise<boolean> {
  try {
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    
    if (listError) {
      console.error('Failed to list buckets:', listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const serviceRoleKey = getSupabaseServiceRoleKey();
      
      if (serviceRoleKey) {
        const { error: createError } = await client.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
        });
        
        if (createError) {
          console.error('Failed to create bucket:', createError);
          return false;
        }
        console.log('Created bucket:', BUCKET_NAME);
        return true;
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

// 获取所有鸣谢记录
export async function GET() {
  try {
    const client = getClient();
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const { data, error } = await client
      .from('acknowledgements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(`查询鸣谢失败: ${error.message}`);
    
    // 转换数据库字段为前端格式，并获取图片公开URL
    const acknowledgements: Acknowledgement[] = await Promise.all((data || []).map(async (row: any) => {
      let imageUrl: string | undefined;
      
      // 如果有 image_key，获取公开URL
      if (row.image_key) {
        // image_key 格式: acknowledgements/ack_xxx.jpeg
        // 需要提取文件名部分
        const fileName = row.image_key.includes('/') 
          ? row.image_key.split('/').pop() 
          : row.image_key;
        
        const { data: urlData } = client.storage
          .from(BUCKET_NAME)
          .getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      
      return {
        id: row.id,
        mongolianName: row.mongolian_name,
        chineseName: row.chinese_name,
        englishName: row.english_name,
        contributionDescription: row.contribution_description,
        quote: row.quote,
        imageUrl: imageUrl,
        imageKey: row.image_key,
        createdByUserId: row.created_by_user_id,
        createdByName: row.created_by_name,
        createdAt: new Date(row.created_at).getTime(),
      };
    }));
    
    return NextResponse.json({ success: true, data: acknowledgements });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 创建鸣谢记录
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const formData = await request.formData();
    
    // 提取字段
    const mongolianName = formData.get('mongolianName') as string;
    const chineseName = formData.get('chineseName') as string | null;
    const englishName = formData.get('englishName') as string | null;
    const contributionDescription = formData.get('contributionDescription') as string;
    const quote = formData.get('quote') as string | null;
    const imageBase64 = formData.get('imageBase64') as string | null;
    const imageType = formData.get('imageType') as string | null;
    const createdByUserId = formData.get('createdByUserId') as string | null;
    const createdByName = formData.get('createdByName') as string | null;
    
    // 验证必填字段
    if (!mongolianName || !contributionDescription) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 生成唯一ID
    const id = `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 处理图片上传到 Supabase Storage
    let imageKey: string | null = null;
    let imageUrl: string | null = null;
    
    if (imageBase64 && imageType) {
      // 确保 bucket 存在
      const bucketReady = await ensureBucketExists(client);
      if (!bucketReady) {
        console.error('Storage bucket not available');
      } else {
        try {
          // 将 base64 转换为 Buffer
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const fileBuffer = Buffer.from(base64Data, 'base64');
          
          // 生成文件名
          const extension = imageType.split('/')[1] || 'jpg';
          const fileName = `${id}.${extension}`;
          
          // 上传到 Supabase Storage
          const { data: uploadData, error: uploadError } = await client.storage
            .from(BUCKET_NAME)
            .upload(fileName, fileBuffer, {
              contentType: imageType,
              upsert: true,
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
          } else {
            // 从 upload 返回的数据中提取文件名（可能包含路径）
            const uploadedKey = uploadData?.path || fileName;
            // 只保存文件名部分，不包含 bucket 前缀
            const fileKey = uploadedKey.includes('/') 
              ? uploadedKey.split('/').pop() || uploadedKey
              : uploadedKey;
            imageKey = fileKey;
            
            // 获取公开访问 URL
            const { data: urlData } = client.storage
              .from(BUCKET_NAME)
              .getPublicUrl(imageKey);
            imageUrl = urlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
    }
    
    // 插入数据库记录
    const record = {
      id,
      mongolian_name: mongolianName,
      chinese_name: chineseName || null,
      english_name: englishName || null,
      contribution_description: contributionDescription,
      quote: quote || null,
      image_key: imageKey,
      created_by_user_id: createdByUserId || null,
      created_by_name: createdByName || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await client
      .from('acknowledgements')
      .insert(record)
      .select()
      .single();
    
    if (error) throw new Error(`创建鸣谢失败: ${error.message}`);

    // 同步：鸣谢姓名为蒙古文 → 入库后立即生成 SVG 显示资源
    let mongolianCacheStale = false;
    try {
      const syncResult = await syncMongolianDisplayForRecord('acknowledgements', data.id, {
        mongolian_name: data.mongolian_name,
        contribution_description: data.contribution_description,
      });
      mongolianCacheStale = syncResult.cacheStale === true;
    } catch (e) {
      console.warn(
        `[acknowledgements POST] sync svg failed for ${data.id}:`,
        e,
      );
      mongolianCacheStale = true;
    }

    // 返回创建的记录
    const acknowledgement: Acknowledgement = {
      id: data.id,
      mongolianName: data.mongolian_name,
      chineseName: data.chinese_name,
      englishName: data.english_name,
      contributionDescription: data.contribution_description,
      quote: data.quote,
      imageKey: data.image_key,
      imageUrl: imageUrl || undefined,
      createdByUserId: data.created_by_user_id,
      createdByName: data.created_by_name,
      createdAt: new Date(data.created_at).getTime(),
    };

    return NextResponse.json({
      success: true,
      data: acknowledgement,
      mongolianCacheStale,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// 删除鸣谢记录
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  try {
    const client = getClient(auth.accessToken);

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }
    
    // 先获取记录以获取图片 key
    const { data: existingData, error: fetchError } = await client
      .from('acknowledgements')
      .select('image_key')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }
    
    // 删除图片（如果存在）
    if (existingData?.image_key) {
      try {
        await client.storage
          .from(BUCKET_NAME)
          .remove([existingData.image_key]);
      } catch (deleteError) {
        console.error('Image delete error:', deleteError);
      }
    }
    
    // 同步：删除时清理蒙古文 SVG 缓存
    try {
      await markOldSvgAsOutdated('acknowledgements', id);
    } catch (e) {
      console.warn(
        `[acknowledgements DELETE] markOldSvgAsOutdated failed for ${id}:`,
        e,
      );
    }

    // 删除数据库记录
    const { error: deleteError } = await client
      .from('acknowledgements')
      .delete()
      .eq('id', id);

    if (deleteError) throw new Error(`删除鸣谢失败: ${deleteError.message}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
