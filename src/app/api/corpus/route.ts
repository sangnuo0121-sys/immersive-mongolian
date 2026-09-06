import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/storage/database/supabase-client';
import { requireAuth } from '@/lib/auth/require-auth';
import { syncMongolianDisplayForRecord } from '@/lib/mongolian-display';
import { transformWord, transformWords } from '@/lib/data/word-transform';
import type { Word } from '@/types';

// 初始词条数据（合并两个环境的完整词条，用于首次填充数据库）
// 所有种子数据统一为 is_user_uploaded: false（系统词条）
// 修改词条只需改这里 → 部署 → 调 POST /api/admin/sync {"action":"force-reset-all"}
const INITIAL_WORDS: Array<{ mongolian: string; pinyin: string; translation_zh: string; translation_en: string; theme: string; difficulty?: number }> = [
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
  { mongolian: 'ᠴᠠᠰᠤ', pinyin: 'cha-su', translation_zh: '雪', translation_en: 'Snow', theme: 'nature-exploration' },
  // 🎓 进阶综合 - 形容词 (Adjectives)
  { mongolian: 'ᠶᠡᠬᠡ', pinyin: 'ye-khe', translation_zh: '大', translation_en: 'Big', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠪᠠᠭ᠎ᠠ', pinyin: 'ba-ga', translation_zh: '小', translation_en: 'Small', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠰᠢᠨ᠎ᠡ', pinyin: 'si-ne', translation_zh: '新', translation_en: 'New', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠬᠠᠭᠤᠴᠢᠨ', pinyin: 'kha-gu-chin', translation_zh: '旧', translation_en: 'Old', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠤᠯᠡᠠ', pinyin: 'u-le-a', translation_zh: '多', translation_en: 'Many', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠴᠥᠭᠡᠨ', pinyin: 'cho-gen', translation_zh: '少', translation_en: 'Few', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠮᠠᠭᠤ', pinyin: 'ma-gu', translation_zh: '坏', translation_en: 'Bad', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 颜色 (Colors)
  { mongolian: 'ᠴᠠᠭᠠᠨ', pinyin: 'cha-gan', translation_zh: '白', translation_en: 'White', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠬᠠᠷ᠎ᠠ', pinyin: 'kha-ra', translation_zh: '黑', translation_en: 'Black', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 人物 (People)
  { mongolian: 'ᠬᠥᠮᠦᠨ', pinyin: 'kho-mun', translation_zh: '人', translation_en: 'Person', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 运动 (Sports)
  { mongolian: 'ᠤᠰᠤᠨ ᠳ᠋ᠤ᠌ ᠤᠮᠪᠠᠬᠤ', pinyin: 'u-sun du um-ba-khu', translation_zh: '游泳', translation_en: 'Swimming', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 日常生活 (Daily Life)
  { mongolian: 'ᠭᠠᠷ ᠦᠳᠡᠰᠦ', pinyin: 'gar u-de-su', translation_zh: '手机', translation_en: 'Mobile phone', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 方位 (Positions)
  { mongolian: 'ᠳᠡᠭᠡᠷ᠎ᠡ', pinyin: 'de-ger-e', translation_zh: '在上面', translation_en: 'On / above', theme: 'advanced-comprehensive' },
  { mongolian: 'ᠳᠣᠣᠷ᠎ᠠ', pinyin: 'do-or-a', translation_zh: '在下面', translation_en: 'Under / below', theme: 'advanced-comprehensive' },
  // 🎓 进阶综合 - 地点 (Places)
  { mongolian: 'ᠭᠠᠵᠠᠷ', pinyin: 'ga-jar', translation_zh: '地方 / 地面', translation_en: 'Place / ground', theme: 'advanced-comprehensive' },
];

// 初始化词条数据到数据库
async function seedInitialWords(client: any, force: boolean = false): Promise<boolean> {
  try {
    // 检查是否已经有系统词条
    const { data: existingData, error: checkError } = await client
      .from('words')
      .select('id')
      .eq('is_user_uploaded', false)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking existing words:', checkError);
      return false;
    }
    
    // 如果已经有系统词条且不强制重置，不需要种子
    if (!force && existingData && existingData.length > 0) {
      console.log('System words already exist, skipping seed');
      return true;
    }
    
    // 如果强制重置，先删除旧系统词条（保留用户自行上传的词条）
    if (force) {
      console.log('Force seed: deleting old seed words...');
      // Delete all seed words (both system and seed-user-uploaded)
      // We use created_at to distinguish: seed data has today's timestamp
      await client.from('words').delete().eq('is_user_uploaded', false);
    }
    
    console.log('Seeding initial words...');
    
    // 按主题分组插入（不再依赖 category_id 外键）
    const records = INITIAL_WORDS.map((word, index) => ({
      mongolian: word.mongolian,
      pinyin: word.pinyin || null,
      translation_zh: word.translation_zh,
      translation_en: word.translation_en,
      theme: word.theme,
      sort_order: index + 1,
      audio_url: null,
      example_mongolian: null,
      example_translation_zh: null,
      example_translation_en: null,
      difficulty: word.difficulty || 1,
      is_user_uploaded: false,
    }));
    
    const { error: insertError } = await client
      .from('words')
      .insert(records);

    if (insertError) {
      console.error('Error seeding words:', insertError);
      return false;
    }

    // 同步：seed 数据里的每条词条都要生成蒙古文 SVG
    try {
      const { data: seededRows } = await client
        .from('words')
        .select('id, mongolian, example_mongolian')
        .eq('is_user_uploaded', false);
      if (seededRows) {
        for (const row of seededRows) {
          await syncMongolianDisplayForRecord('words', row.id, {
            mongolian: row.mongolian,
            example_mongolian: row.example_mongolian,
          });
        }
      }
    } catch (syncErr) {
      console.warn('[seedInitialWords] post-seed svg sync failed:', syncErr);
    }

    console.log('Successfully seeded initial words');
    return true;
  } catch (error) {
    console.error('Error in seedInitialWords:', error);
    return false;
  }
}

// 获取所有词条（按分类和排序）
export async function GET(request: NextRequest) {
  try {
    const forceSeed = request.nextUrl.searchParams.get('forceSeed') === 'true';
    
    let client: ReturnType<typeof getClient> | null = null;
    try {
      client = getClient();
    } catch (e) {
      console.warn('[Corpus API] Supabase client unavailable, using local fallback:', e);
    }
    
    if (client) {
      try {
        // 仅在显式请求时才执行种子检查（部署时通过 /api/admin/sync 执行）
        // 移除每次请求的自动种子检查，减少数据库查询次数
        if (forceSeed) {
          await seedInitialWords(client, true);
        }
        
        // 获取词条：系统词条在前，用户上传在后
        const { data, error } = await client
          .from('words')
          .select('*')
          .order('is_user_uploaded', { ascending: true })
          .order('theme', { ascending: true })
          .order('sort_order', { ascending: true, nullsFirst: true });
        
        if (!error && data && data.length > 0) {
          // 转换数据库字段为前端格式（统一使用 transformWords helper）
          const words = transformWords(data);

          return NextResponse.json({ success: true, data: words });
        }
        
        if (error) {
          console.warn('[Corpus API] Supabase query error, falling back to local data:', error);
        }
      } catch (dbError: any) {
        console.warn('[Corpus API] Database error, falling back to local data:', dbError);
      }
    }
    
    // Fallback: 使用本地数据
    console.log('[Corpus API] Using local corpus data as fallback');
    const { corpusWords } = await import('@/data/corpus');
    return NextResponse.json({ success: true, data: corpusWords });
    
  } catch (error: any) {
    console.error('GET /api/corpus error:', error);
    // 最终 fallback：返回本地数据
    try {
      const { corpusWords } = await import('@/data/corpus');
      return NextResponse.json({ success: true, data: corpusWords });
    } catch {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  }
}

// 批量插入词条（新词自动追加到末尾）
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    const client = getClient(auth.accessToken);
    
    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Database service not available' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    const wordsToInsert = Array.isArray(body) ? body : [body];
    
    // 为每个词条计算 sort_order（获取当前主题最大 sort_order + 1）
    const records = await Promise.all(wordsToInsert.map(async (word: any) => {
      // 获取该主题的最大 sort_order
      const { data: maxData } = await client
        .from('words')
        .select('sort_order')
        .eq('theme', word.theme || 'basic-conversation')
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const maxSortOrder = maxData && maxData.length > 0 ? (maxData[0].sort_order || 0) : 0;
      
      // 处理翻译字段（支持多种格式）
      let translationZh = '';
      let translationEn = '';
      
      if (typeof word.translation === 'object' && word.translation !== null) {
        translationZh = word.translation.zh || '';
        translationEn = word.translation.en || '';
      }
      // 同时检查顶级字段（translation_zh/translation_en 优先级低于 translation 对象）
      if (!translationZh && typeof word.translation_zh === 'string') {
        translationZh = word.translation_zh;
      }
      if (!translationEn && typeof word.translation_en === 'string') {
        translationEn = word.translation_en;
      }
      
      // 如果只有一个翻译，两个字段都使用
      if (translationZh && !translationEn) translationEn = translationZh;
      if (translationEn && !translationZh) translationZh = translationEn;
      
      // 处理例句
      let exampleMongolian = null;
      let exampleTranslationZh = null;
      let exampleTranslationEn = null;
      
      if (word.example) {
        exampleMongolian = word.example.mongolian || null;
        if (typeof word.example.translation === 'object' && word.example.translation !== null) {
          exampleTranslationZh = word.example.translation.zh || null;
          exampleTranslationEn = word.example.translation.en || null;
        }
      }
      
      return {
        id: word.id || crypto.randomUUID(),
        mongolian: word.mongolian || '',
        pinyin: word.pinyin || null,
        translation_zh: translationZh,
        translation_en: translationEn,
        theme: word.theme || 'basic-conversation',
        sort_order: maxSortOrder + 1,
        audio_url: word.audio || word.audioUrl || null,
        example_mongolian: exampleMongolian,
        example_translation_zh: exampleTranslationZh,
        example_translation_en: exampleTranslationEn,
        difficulty: word.difficulty || 1,
        is_user_uploaded: word.isUserUploaded !== undefined ? word.isUserUploaded : true,
        created_by_user_id: auth.userId,
        created_by_name: auth.email || 'User',
      };
    }));
    
    const { data, error } = await client
      .from('words')
      .insert(records)
      .select();

    if (error) {
      console.error('Insert error:', error);
      throw new Error(`插入词条失败: ${error.message}`);
    }

    // 同步：每条新词条都要生成蒙古文 SVG 显示资源
    const staleWordIds: string[] = [];
    if (data && Array.isArray(data)) {
      for (const row of data) {
        try {
          const syncResult = await syncMongolianDisplayForRecord('words', row.id, {
            mongolian: row.mongolian,
            example_mongolian: row.example_mongolian,
          });
          if (syncResult.cacheStale === true) {
            staleWordIds.push(row.id);
          }
        } catch (syncErr) {
          console.warn(
            `[corpus POST] sync svg failed for word ${row.id}:`,
            syncErr,
          );
          // 同步失败默认视为 stale（前端可走 API 兜底）
          staleWordIds.push(row.id);
        }
      }
    }

    // 转换数据库行为前端期望的格式
    const transformedData = Array.isArray(data) ? transformWords(data) : transformWord(data);

    return NextResponse.json({
      success: true,
      data: transformedData,
      staleWordIds,
    });
  } catch (error: any) {
    console.error('POST /api/corpus error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
