/**
 * 数据库行 → 前端 Word 对象
 * 统一所有 API 端点的响应格式
 */

export interface DbWordRow {
  id: string;
  mongolian: string | null;
  pinyin?: string | null;
  translation_zh?: string | null;
  translation_en?: string | null;
  theme?: string | null;
  sort_order?: number | null;
  audio_url?: string | null;
  example_mongolian?: string | null;
  example_translation_zh?: string | null;
  example_translation_en?: string | null;
  difficulty?: number | null;
  is_user_uploaded?: boolean | null;
  created_at?: string | number | null;
  [key: string]: any;
}

export function transformWord(row: DbWordRow): any {
  if (!row) return row;
  return {
    id: row.id,
    mongolian: row.mongolian || '',
    pinyin: row.pinyin || '',
    translation: {
      zh: row.translation_zh || row.translation_en || '',
      en: row.translation_en || row.translation_zh || '',
    },
    theme: row.theme || 'basic-conversation',
    sortOrder: row.sort_order || 1,
    audio: row.audio_url || '',
    example: row.example_mongolian
      ? {
          mongolian: row.example_mongolian,
          translation: {
            zh: row.example_translation_zh || '',
            en: row.example_translation_en || '',
          },
        }
      : undefined,
    isUserUploaded: row.is_user_uploaded || false,
    createdByUserId: row.created_by_user_id || undefined,
    createdAt: row.created_at
      ? typeof row.created_at === 'number'
        ? row.created_at
        : new Date(row.created_at).getTime()
      : Date.now(),
  };
}

export function transformWords(rows: DbWordRow[] | null | undefined): any[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map(transformWord);
}
