// 统一的数据格式转换器
// 把 Supabase 的原始 row（snake_case 字段）转换为前端类型（嵌套对象 + camelCase）
// 这是 "Save 后前端立即显示新内容" 修复链的关键一环：
//   1. API 返回结构化数据 → 前端不再需要用旧的（乐观更新）版本
//   2. 前端拿到的 result.data 字段名与类型完全匹配 → 不会出现 `word.translation.zh` undefined
//   3. AppContext 用 result.data 替换本地 state → 蒙古文内容变化立即反映到 UI
//   4. MongolianTextImage 的 alt 变化 → SVG cache key 变化 → 重新渲染
//
// 重要：词条（Word）相关的转换在 src/lib/data/word-transform.ts，本文件只放
//       其他模块（智慧语录、声音档案、文化文章、鸣谢）的转换器。

import type {
  WisdomQuote,
  CultureArticle,
  OralArchive,
  Acknowledgement,
} from '@/types';

// ============================================================
// 智慧语录 (wisdom_quotes)
// ============================================================

function pickTranslation(row: any, key: 'zh' | 'en', ...candidates: any[]): string {
  for (const c of candidates) {
    const v = typeof c === 'function' ? c(row) : c;
    if (v) return String(v);
  }
  return '';
}

export function transformWisdomQuote(row: any): WisdomQuote {
  if (!row) return row;
  return {
    id: row.id,
    mongolian: row.mongolian || '',
    translation: {
      zh:
        row.translation_zh ||
        row.translationZh ||
        row.translation?.zh ||
        '',
      en:
        row.translation_en ||
        row.translationEn ||
        row.translation?.en ||
        '',
    },
    author: row.author || '',
    category: row.category || 'wisdom',
    audio:
      row.audio_url ||
      row.audioUrl ||
      row.audio ||
      '',
    isUserUploaded: row.is_user_uploaded ?? row.isUserUploaded ?? true,
    createdByUserId: row.created_by_user_id || row.createdByUserId || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt || Date.now(),
  };
}

export function transformWisdomQuotes(rows: any[] | null | undefined): WisdomQuote[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(transformWisdomQuote);
}

// ============================================================
// 文化文章 (culture_articles)
// 表单：title_zh/title_mn/title_en + content_zh/content_mn/content_en + cover_image_url
// 类型：title{zh,mn,en} + content{zh,mn,en} + images[] + imageKeys[] + authorName?
// ============================================================

export function transformCultureArticle(row: any): CultureArticle {
  if (!row) return row;
  // images: 优先用 images 数组；其次 cover_image_url 包装成单元素
  let images: string[] = [];
  if (Array.isArray(row.images) && row.images.length > 0) {
    images = row.images;
  } else if (row.cover_image_url) {
    images = [row.cover_image_url];
  } else if (row.coverImage) {
    images = [row.coverImage];
  }
  // imageKeys: 保留以支持编辑/删除
  let imageKeys: string[] = [];
  if (Array.isArray(row.image_keys)) {
    imageKeys = row.image_keys;
  } else if (row.imageKey) {
    imageKeys = [row.imageKey];
  }
  return {
    id: row.id,
    title: {
      zh: row.title_zh || row.titleZh || row.title?.zh || '',
      mn: row.title_mn || row.titleMn || row.title?.mn || '',
      en: row.title_en || row.titleEn || row.title?.en || '',
    },
    content: {
      zh: row.content_zh || row.contentZh || row.content?.zh || '',
      mn: row.content_mn || row.contentMn || row.content?.mn || '',
      en: row.content_en || row.contentEn || row.content?.en || '',
    },
    images,
    imageKeys: imageKeys.length > 0 ? imageKeys : undefined,
    category: row.category || undefined,
    authorName: row.author_name || row.authorName || row.author || undefined,
    isUserUploaded:
      row.is_user_uploaded ?? row.isUserUploaded ?? true,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt || Date.now(),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).getTime()
      : row.updatedAt,
  };
}

export function transformCultureArticles(
  rows: any[] | null | undefined,
): CultureArticle[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(transformCultureArticle);
}

// ============================================================
// 声音档案 (oral_archives)
// 表单：title_zh/title_mn/title_en + description_zh + uploader_name + audio_url/audio_key
// 类型：title{zh,mn,en} + description{zh,mn,en} + audioUrl + audioKey? + durationSeconds? + uploaderName?
// ============================================================

export function transformOralArchive(row: any): OralArchive {
  if (!row) return row;
  return {
    id: row.id,
    title: {
      zh: row.title_zh || row.titleZh || row.title?.zh || '',
      mn: row.title_mn || row.titleMn || row.title?.mn || '',
      en: row.title_en || row.titleEn || row.title?.en || '',
    },
    description: {
      zh:
        row.description_zh ||
        row.descriptionZh ||
        row.description?.zh ||
        '',
      mn:
        row.description_mn ||
        row.descriptionMn ||
        row.description?.mn ||
        '',
      en:
        row.description_en ||
        row.descriptionEn ||
        row.description?.en ||
        '',
    },
    audioUrl: row.audio_url || row.audioUrl || '',
    audioKey: row.audio_key || row.audioKey || undefined,
    durationSeconds:
      row.duration_seconds ?? row.durationSeconds ?? row.duration ?? undefined,
    uploaderName:
      row.uploader_name || row.uploaderName || row.uploader || undefined,
    isUserUploaded:
      row.is_user_uploaded ?? row.isUserUploaded ?? true,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt || Date.now(),
    updatedAt: row.updated_at
      ? new Date(row.updated_at).getTime()
      : row.updatedAt,
  };
}

export function transformOralArchives(
  rows: any[] | null | undefined,
): OralArchive[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(transformOralArchive);
}

// ============================================================
// 鸣谢 (acknowledgements)
// 表单：mongolian_name/chinese_name/english_name/contribution_description/quote/image_key
// 类型：mongolianName + chineseName? + englishName? + contributionDescription + quote? + imageKey? + imageUrl? + createdByUserId? + createdByName? + createdAt
// ============================================================

export function transformAcknowledgement(row: any): Acknowledgement {
  if (!row) return row;
  return {
    id: row.id,
    mongolianName: row.mongolian_name || row.mongolianName || '',
    chineseName: row.chinese_name || row.chineseName || undefined,
    englishName: row.english_name || row.englishName || undefined,
    contributionDescription:
      row.contribution_description ||
      row.contributionDescription ||
      row.contribution ||
      '',
    quote: row.quote || row.message || undefined,
    imageKey: row.image_key || row.imageKey || undefined,
    imageUrl: row.image_url || row.imageUrl || row.avatar_url || row.avatarUrl || undefined,
    createdByUserId:
      row.created_by_user_id || row.createdByUserId || undefined,
    createdByName:
      row.created_by_name || row.createdByName || row.created_by || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).getTime()
      : row.createdAt || Date.now(),
  };
}

export function transformAcknowledgements(
  rows: any[] | null | undefined,
): Acknowledgement[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(transformAcknowledgement);
}
