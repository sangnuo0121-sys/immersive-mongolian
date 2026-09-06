import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database';
import { requireAdmin } from '@/lib/auth/require-auth';

// 所有种子数据统一为系统词条（is_user_uploaded: false）
const INITIAL_WORDS: Array<{
  mongolian: string; pinyin: string; translation_zh: string; translation_en: string;
  theme: string;
}> = [
  // 💬 基本对话 (Basic Conversation)
  { mongolian: 'ᠰᠠᠶ᠋ᠢᠨ ‍ᠤᠤ?', pinyin: 'sain uu', translation_zh: '你好 / 你好吗', translation_en: 'Hello / How are you', theme: 'basic-conversation' },
  { mongolian: 'ᠥᠷᠯᠥᠭᠡ ᠰᠠᠶ᠋ᠢᠨ ‍ᠤᠤ?', pinyin: 'ur-le-ge sain uu', translation_zh: '早上好', translation_en: 'Good morning', theme: 'basic-conversation' },
  { mongolian: 'ᠦᠳᠡ ᠶ᠋ᠢᠨ ᠮᠡᠨᠳᠦ', pinyin: 'u-de yin men-du', translation_zh: '中午好 / 下午好', translation_en: 'Good noon / afternoon', theme: 'basic-conversation' },
  { mongolian: 'ᠣᠷᠣᠢ ᠶᠢᠨ ᠮᠡᠨᠳᠦ', pinyin: 'o-roi yin men-du', translation_zh: '晚上好', translation_en: 'Good evening', theme: 'basic-conversation' },
  { mongolian: 'ᠰᠠᠢᠨ ᠪᠠᠢᠵᠠᠭᠠᠨ᠎ᠠ ᠤᠤ?', pinyin: 'sain bai-ja-gan-a uu', translation_zh: '大家好', translation_en: 'Hello everyone', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠣᠯᠤᠨ᠎ᠠ', pinyin: 'bo-lu-na', translation_zh: '好 / 可以 / 是', translation_en: 'Good / Yes', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠢᠰᠢ', pinyin: 'bi-shi', translation_zh: '不是 / 不', translation_en: 'Not', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠠᠶᠠᠷᠲᠠᠢ', pinyin: 'ba-yar-tai', translation_zh: '再见', translation_en: 'Goodbye', theme: 'basic-conversation' },
  { mongolian: 'ᠲᠠᠯᠠᠷᠬᠠᠯ᠎ᠠ', pinyin: 'ta-lar-kha-la', translation_zh: '谢谢', translation_en: 'Thank you', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠠᠶᠠᠷᠯᠠᠯ᠎ᠠ', pinyin: 'ba-yar-la-la', translation_zh: '谢谢', translation_en: 'Thank you', theme: 'basic-conversation' },
  { mongolian: 'ᠣᠰᠣᠯ ᠪᠣᠯᠤᠯ᠎ᠠ', pinyin: 'o-sol bo-lu-la', translation_zh: '对不起', translation_en: 'Sorry', theme: 'basic-conversation' },
  { mongolian: 'ᠬᠠᠮᠢᠶ᠎ᠠ ᠦᠭᠡᠢ', pinyin: 'kha-mi-a u-gei', translation_zh: '没关系', translation_en: 'No worries', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠢ ᠴᠢᠮ᠎ᠠ ᠳ᠋ᠤ᠌ ᠬᠠᠢᠷᠠᠲᠠᠢ', pinyin: 'bi chi-ma du khai-ra-tai', translation_zh: '我爱你', translation_en: 'I love you', theme: 'basic-conversation' },
  { mongolian: 'ᠨᠡᠷ᠎ᠡ', pinyin: 'ne-re', translation_zh: '名字', translation_en: 'Name', theme: 'basic-conversation' },
  { mongolian: 'ᠪᠠᠢᠨ᠎ᠠ', pinyin: 'bai-na', translation_zh: '有 / 存在', translation_en: 'There is / to be', theme: 'basic-conversation' },
  { mongolian: 'ᠦᠭᠡᠢ', pinyin: 'u-gei', translation_zh: '没有 / 不', translation_en: 'There is no / no', theme: 'basic-conversation' },
  // 🍖 美食之旅 (Food Journey)
  { mongolian: 'ᠮᠢᠬ᠎ᠠ', pinyin: 'mi-kha', translation_zh: '肉', translation_en: 'Meat', theme: 'food-journey' },
  { mongolian: 'ᠬᠣᠨᠢᠨ ᠮᠢᠬ᠎ᠠ', pinyin: 'kho-nin mi-kha', translation_zh: '羊肉', translation_en: 'Mutton', theme: 'food-journey' },
  { mongolian: 'ᠪᠤᠳᠠᠭ᠎ᠠ', pinyin: 'bu-da-ga', translation_zh: '饭 / 米饭', translation_en: 'Meal / rice', theme: 'food-journey' },
  { mongolian: 'ᠭᠤᠯᠢᠷ', pinyin: 'gu-lir', translation_zh: '面条', translation_en: 'Noodles', theme: 'food-journey' },
  { mongolian: 'ᠴᠠᠢ', pinyin: 'chai', translation_zh: '茶', translation_en: 'Tea', theme: 'food-journey' },
  { mongolian: 'ᠰᠦ᠋', pinyin: 'su', translation_zh: '牛奶', translation_en: 'Milk', theme: 'food-journey' },
  { mongolian: 'ᠰᠦ᠋ ᠲᠡᠶ ᠴᠡᠢ', pinyin: 'su-tei chai', translation_zh: '奶茶', translation_en: 'Milk tea', theme: 'food-journey' },
  { mongolian: 'ᠠᠷᠢᠬᠢ', pinyin: 'a-ri-khi', translation_zh: '酒', translation_en: 'Alcohol', theme: 'food-journey' },
  { mongolian: 'ᠤᠰᠤ', pinyin: 'woos', translation_zh: '水', translation_en: 'Water', theme: 'food-journey' },
  { mongolian: 'ᠴᠠᠳᠬᠤ', pinyin: 'cha-d-khu', translation_zh: '饱', translation_en: 'Full', theme: 'food-journey' },
  { mongolian: 'ᠥᠯᠥᠰᠬᠦ', pinyin: 'o-lo-s-khu', translation_zh: '饿', translation_en: 'Hungry', theme: 'food-journey' },
  // 👨‍👩‍👧‍👦 家庭成员 (Family Members)
  { mongolian: 'ᠠᠪᠤ', pinyin: 'a-bu', translation_zh: '父亲', translation_en: 'Father', theme: 'family-members' },
  { mongolian: 'ᠡᠵᠢ', pinyin: 'e-ji', translation_zh: '母亲', translation_en: 'Mother', theme: 'family-members' },
  { mongolian: 'ᠠᠬ᠎ᠠ', pinyin: 'a-kha', translation_zh: '哥哥', translation_en: 'Elder brother', theme: 'family-members' },
  { mongolian: 'ᠡᠭᠡᠴᠢ', pinyin: 'e-ge-chi', translation_zh: '姐姐 / 妹妹', translation_en: 'Sister', theme: 'family-members' },
  { mongolian: 'ᠭᠡᠷ', pinyin: 'ger', translation_zh: '家 / 房子', translation_en: 'Home / house', theme: 'family-members' },
  { mongolian: 'ᠬᠦᠦ', pinyin: 'khuu', translation_zh: '儿子', translation_en: 'Son', theme: 'family-members' },
  { mongolian: 'ᠬᠡᠦᠬᠡᠨ', pinyin: 'khe-u-khen', translation_zh: '女儿', translation_en: 'Daughter', theme: 'family-members' },
  // 🔢 数字王国 (Number Kingdom)
  { mongolian: 'ᠨᠢᠭᠡ', pinyin: 'ni-ge', translation_zh: '一', translation_en: 'One', theme: 'number-kingdom' },
  { mongolian: 'ᠬᠤᠶᠡᠷ', pinyin: 'khu-yer', translation_zh: '二', translation_en: 'Two', theme: 'number-kingdom' },
  { mongolian: 'ᠭᠤᠷᠪᠠ', pinyin: 'gur-ba', translation_zh: '三', translation_en: 'Three', theme: 'number-kingdom' },
  { mongolian: 'ᠲᠦᠷᠪᠡ', pinyin: 'tur-be', translation_zh: '四', translation_en: 'Four', theme: 'number-kingdom' },
  { mongolian: 'ᠲᠠᠪᠤ', pinyin: 'ta-bu', translation_zh: '五', translation_en: 'Five', theme: 'number-kingdom' },
  { mongolian: 'ᠵᠢᠷᠭᠤᠭ᠎ᠠ', pinyin: 'jir-gu-ga', translation_zh: '六', translation_en: 'Six', theme: 'number-kingdom' },
  { mongolian: 'ᠲᠤᠯᠤᠭ᠎ᠠ', pinyin: 'to-lo-ga', translation_zh: '七', translation_en: 'Seven', theme: 'number-kingdom' },
  { mongolian: 'ᠨᠠᠢᠮᠠ', pinyin: 'nai-ma', translation_zh: '八', translation_en: 'Eight', theme: 'number-kingdom' },
  { mongolian: 'ᠶᠢᠰᠦ', pinyin: 'yi-su', translation_zh: '九', translation_en: 'Nine', theme: 'number-kingdom' },
  { mongolian: 'ᠠᠷᠪᠠ', pinyin: 'ar-ba', translation_zh: '十', translation_en: 'Ten', theme: 'number-kingdom' },
  { mongolian: 'ᠵᠠᠭᠤ', pinyin: 'ja-gu', translation_zh: '百', translation_en: 'Hundred', theme: 'number-kingdom' },
  { mongolian: 'ᠮᠢᠩᠭ᠎ᠠ', pinyin: 'ming-ga', translation_zh: '千', translation_en: 'Thousand', theme: 'number-kingdom' },
  { mongolian: 'ᠲᠦᠮᠡ', pinyin: 'tu-me', translation_zh: '万', translation_en: 'Ten thousand', theme: 'number-kingdom' },
  // 🏔️ 蒙古文化 (Mongolian Culture)
  { mongolian: 'ᠮᠤᠩᠭᠣᠯ', pinyin: 'mong-gol', translation_zh: '蒙古', translation_en: 'Mongolia / Mongol', theme: 'mongolian-culture' },
  { mongolian: 'ᠤᠯᠤᠰ', pinyin: 'u-lus', translation_zh: '国家 / 祖国', translation_en: 'Country / motherland', theme: 'mongolian-culture' },
  { mongolian: 'ᠦᠨᠳᠦᠰᠦᠲᠡᠨ', pinyin: 'u-ndu-su-ten', translation_zh: '民族', translation_en: 'Nation', theme: 'mongolian-culture' },
  { mongolian: 'ᠲᠩᠷᠢ', pinyin: 'teng-ri', translation_zh: '腾格里 / 长生天', translation_en: 'Tengri / eternal sky', theme: 'mongolian-culture' },
  { mongolian: 'ᠮᠣᠷᠢᠨ ᠬᠤᠭᠤᠷ', pinyin: 'mo-rin khu-gur', translation_zh: '马头琴', translation_en: 'Morin Khuur', theme: 'mongolian-culture' },
  { mongolian: 'ᠮᠣᠷᠢ ᠤᠨᠤᠬᠤ', pinyin: 'mo-ri u-nu-khu', translation_zh: '骑马', translation_en: 'Horse riding', theme: 'mongolian-culture' },
  { mongolian: 'ᠪᠥᠬᠡ ᠪᠠᠷᠢᠯᠳᠤᠬᠤ', pinyin: 'bo-khe ba-ril-du-khu', translation_zh: '摔跤', translation_en: 'Wrestling', theme: 'mongolian-culture' },
  { mongolian: 'ᠰᠢᠳᠡᠷ᠎ᠡ ᠲᠠᠯᠪᠢᠬᠤ', pinyin: 'si-te-re tal-be-khu', translation_zh: '下棋', translation_en: 'Chess playing', theme: 'mongolian-culture' },
  // 🌿 自然探索 (Nature Exploration)
  { mongolian: 'ᠮᠣᠷᠢ', pinyin: 'mo-ri', translation_zh: '马', translation_en: 'Horse', theme: 'nature-exploration' },
  { mongolian: 'ᠦᠬᠡᠷ', pinyin: 'u-kher', translation_zh: '牛', translation_en: 'Cattle', theme: 'nature-exploration' },
  { mongolian: 'ᠬᠤᠨᠢ', pinyin: 'khu-ni', translation_zh: '羊', translation_en: 'Sheep', theme: 'nature-exploration' },
  { mongolian: 'ᠢᠮᠠᠭ᠎ᠠ', pinyin: 'i-ma-ga', translation_zh: '山羊', translation_en: 'Goat', theme: 'nature-exploration' },
  { mongolian: 'ᠲᠡᠮᠡᠭᠡ', pinyin: 'te-me-ge', translation_zh: '骆驼', translation_en: 'Camel', theme: 'nature-exploration' },
  { mongolian: 'ᠨᠣᠬᠠᠶ', pinyin: 'no-khai', translation_zh: '狗', translation_en: 'Dog', theme: 'nature-exploration' },
  { mongolian: 'ᠮᠤᠤᠷ', pinyin: 'mu-ur', translation_zh: '猫', translation_en: 'Cat', theme: 'nature-exploration' },
  { mongolian: 'ᠲᠠᠤᠯᠠᠶ', pinyin: 'tau-lai', translation_zh: '兔子', translation_en: 'Rabbit', theme: 'nature-exploration' },
  { mongolian: 'ᠲᠡᠬᠢᠶ᠎ᠠ', pinyin: 'te-khi-ya', translation_zh: '鸡', translation_en: 'Chicken', theme: 'nature-exploration' },
  { mongolian: 'ᠪᠦᠷᠭᠦᠳ', pinyin: 'bur-gu-d', translation_zh: '鹰', translation_en: 'Eagle', theme: 'nature-exploration' },
  // 🎓 进阶综合 (Advanced Comprehensive)
  { mongolian: 'ᠪᠢ', pinyin: 'bi', translation_zh: '我', translation_en: 'I', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠴᠢ', pinyin: 'chi', translation_zh: '你', translation_en: 'You', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠲᠠ', pinyin: 'ta', translation_zh: '您', translation_en: 'You (polite)', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠮᠢᠨᠦ', pinyin: 'mini', translation_zh: '我的', translation_en: 'My', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠦᠵᠡᠬᠦ', pinyin: 'u-je-khu', translation_zh: '看', translation_en: 'Look', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠰᠤᠷᠤᠯᠴᠠᠬᠤ', pinyin: 'su-rul-cha-khu', translation_zh: '学习', translation_en: 'Learn', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠨᠣᠮ', pinyin: 'nom', translation_zh: '书', translation_en: 'Book', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠦᠰᠦᠭ', pinyin: 'u-sug', translation_zh: '文字 / 字母', translation_en: 'Writing / letter', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠨᠥᠬᠥᠷ', pinyin: 'no-hor', translation_zh: '朋友', translation_en: 'Friend', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠰᠠᠢᠨ', pinyin: 'sain', translation_zh: '好', translation_en: 'Good', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠢᠳᠡ', pinyin: 'i-de', translation_zh: '吃', translation_en: 'Eat', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠤᠤᠭᠤ', pinyin: 'u-u-gu', translation_zh: '喝', translation_en: 'Drink', theme: 'advanced-comprehensive' },
  // 🌤️ 自然探索 - 天气与自然 (Nature - Weather & Nature)
  { mongolian: 'ᠣᠭᠲᠠᠷᠭᠤᠶ', pinyin: 'og-tar-gui', translation_zh: '天空', translation_en: 'Sky', theme: 'nature-exploration' },
  { mongolian: 'ᠨᠡᠷᠠ', pinyin: 'na-ra', translation_zh: '太阳', translation_en: 'Sun', theme: 'nature-exploration' },
  { mongolian: 'ᠰᠡᠷᠠ', pinyin: 'sar', translation_zh: '月亮', translation_en: 'Moon', theme: 'nature-exploration' },
  { mongolian: 'ᠤᠳᠤ', pinyin: 'u-du', translation_zh: '星星', translation_en: 'Star', theme: 'nature-exploration' },
  { mongolian: 'ᠰᠠᠯᠬᠢ', pinyin: 'sal-khi', translation_zh: '风', translation_en: 'Wind', theme: 'nature-exploration' },
  { mongolian: 'ᠪᠣᠷᠣᠭᠠᠨ', pinyin: 'bo-ro-gan', translation_zh: '雨', translation_en: 'Rain', theme: 'nature-exploration' },
];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    if (action === 'reset-words') {
      return await resetWords(false, auth.accessToken);
    } else if (action === 'force-reset-words') {
      return await resetWords(true, auth.accessToken);
    } else if (action === 'reset-all' || action === 'force-reset-all') {
      const wordsResponse = await resetWords(action === 'force-reset-all', auth.accessToken);
      const wordsResult = await wordsResponse.json();
      return NextResponse.json({
        success: true,
        message: action === 'force-reset-all' ? 'All data force-reset' : 'All data reset',
        words: wordsResult,
      });
    }

    // Default: show current status
    const client = getClient(auth.accessToken);

    const { data: words } = await client.from('words').select('id, theme, is_user_uploaded');
    const { data: wisdom } = await client.from('wisdom_quotes').select('id');

    return NextResponse.json({
      success: true,
      status: {
        words: {
          total: words?.length || 0,
          system: words?.filter(w => !w.is_user_uploaded).length || 0,
          userUploaded: words?.filter(w => w.is_user_uploaded).length || 0,
          byTheme: words?.reduce((acc: Record<string, number>, w: { theme: string }) => {
            acc[w.theme] = (acc[w.theme] || 0) + 1;
            return acc;
          }, {}),
        },
        wisdom: {
          total: wisdom?.length || 0,
          allUserUploaded: true,
        },
      },
      availableActions: [
        'reset-words (preserve user-uploaded)',
        'force-reset-words (delete everything, re-seed)',
        'reset-all (preserve user-uploaded)',
        'force-reset-all (delete everything, re-seed)',
      ],
    });
  } catch (error) {
    console.error('Admin sync error:', error);
    return NextResponse.json({ error: 'Sync failed', details: String(error) }, { status: 500 });
  }
}

async function resetWords(force: boolean, accessToken: string): Promise<NextResponse> {
  const client = getClient(accessToken);

  if (force) {
    const { error: deleteError } = await client.from('words').delete().neq('id', '');
    if (deleteError) console.error('Error force-deleting words:', deleteError);
  } else {
    const { error: deleteError } = await client.from('words').delete().eq('is_user_uploaded', false);
    if (deleteError) console.error('Error deleting system words:', deleteError);
  }

  const records = INITIAL_WORDS.map((word, index) => ({
    mongolian: word.mongolian,
    pinyin: word.pinyin,
    translation_zh: word.translation_zh,
    translation_en: word.translation_en,
    theme: word.theme,
    sort_order: index + 1,
    difficulty: 1,
    is_user_uploaded: false,
    audio_url: null,
  }));

  const { data: insertedData, error: insertError } = await client
    .from('words')
    .insert(records)
    .select();

  if (insertError) {
    console.error('Error inserting words:', insertError);
    return NextResponse.json({ success: false, error: insertError.message });
  }

  return NextResponse.json({
    success: true,
    mode: force ? 'force' : 'preserve-user',
    deleted: force ? 'all words cleared' : 'system words cleared',
    inserted: insertedData?.length || 0,
  });
}
