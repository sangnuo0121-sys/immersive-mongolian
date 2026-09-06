import { Word, WisdomQuote, ThemeId } from '@/types';

// 词条数据 - 与数据库种子数据保持一致
// 修改词条只需改 corpus/route.ts 和 admin/sync/route.ts 的 INITIAL_WORDS
// 本文件作为 Supabase 不可用时的本地 fallback
export const corpusWords: Word[] = [
  // 💬 基本对话 (Basic Conversation)
  { id: 'bc_01', mongolian: 'ᠰᠠᠶ᠋ᠢᠨ ‍ᠤᠤ?', pinyin: 'sain uu', translation: { zh: '你好 / 你好吗', en: 'Hello / How are you' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_02', mongolian: 'ᠥᠷᠯᠥᠭᠡ ᠰᠠᠶ᠋ᠢᠨ ‍ᠤᠤ?', pinyin: 'ur-le-ge sain uu', translation: { zh: '早上好', en: 'Good morning' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_03', mongolian: 'ᠦᠳᠡ ᠶ᠋ᠢᠨ ᠮᠡᠨᠳᠦ', pinyin: 'u-de yin men-du', translation: { zh: '中午好 / 下午好', en: 'Good noon / afternoon' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_04', mongolian: 'ᠣᠷᠣᠢ ᠶᠢᠨ ᠮᠡᠨᠳᠦ', pinyin: 'o-roi yin men-du', translation: { zh: '晚上好', en: 'Good evening' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_05', mongolian: 'ᠰᠠᠢᠨ ᠪᠠᠢᠵᠠᠭᠠᠨ᠎ᠠ ᠤᠤ?', pinyin: 'sain bai-ja-gan-a uu', translation: { zh: '大家好', en: 'Hello everyone' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_06', mongolian: 'ᠪᠣᠯᠤᠨ᠎ᠠ', pinyin: 'bo-lu-na', translation: { zh: '好 / 可以 / 是', en: 'Good / Yes' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_07', mongolian: 'ᠪᠢᠰᠢ', pinyin: 'bi-shi', translation: { zh: '不是 / 不', en: 'Not' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_08', mongolian: 'ᠪᠠᠶᠠᠷᠲᠠᠢ', pinyin: 'ba-yar-tai', translation: { zh: '再见', en: 'Goodbye' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_09', mongolian: 'ᠲᠠᠯᠠᠷᠬᠠᠯ᠎ᠠ', pinyin: 'ta-lar-kha-la', translation: { zh: '谢谢', en: 'Thank you' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_10', mongolian: 'ᠪᠠᠶᠠᠷᠯᠠᠯ᠎ᠠ', pinyin: 'ba-yar-la-la', translation: { zh: '谢谢', en: 'Thank you' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_11', mongolian: 'ᠣᠰᠣᠯ ᠪᠣᠯᠤᠯ᠎ᠠ', pinyin: 'o-sol bo-lu-la', translation: { zh: '对不起', en: 'Sorry' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_12', mongolian: 'ᠬᠠᠮᠢᠶ᠎ᠠ ᠦᠭᠡᠢ', pinyin: 'kha-mi-a u-gei', translation: { zh: '没关系', en: 'No worries' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_13', mongolian: 'ᠪᠢ ᠴᠢᠮ᠎ᠠ ᠳ᠋ᠤ᠌ ᠬᠠᠢᠷᠠᠲᠠᠢ', pinyin: 'bi chi-ma du khai-ra-tai', translation: { zh: '我爱你', en: 'I love you' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_14', mongolian: 'ᠨᠡᠷ᠎ᠡ', pinyin: 'ne-re', translation: { zh: '名字', en: 'Name' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_15', mongolian: 'ᠪᠠᠢᠨ᠎ᠠ', pinyin: 'bai-na', translation: { zh: '有 / 存在', en: 'There is / to be' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  { id: 'bc_16', mongolian: 'ᠦᠭᠡᠢ', pinyin: 'u-gei', translation: { zh: '没有 / 不', en: 'There is no / no' }, theme: 'basic-conversation', difficulty: 1, createdAt: Date.now() },
  // 🍖 美食之旅 (Food Journey)
  { id: 'fj_01', mongolian: 'ᠮᠢᠬ᠎ᠠ', pinyin: 'mi-kha', translation: { zh: '肉', en: 'Meat' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_02', mongolian: 'ᠬᠣᠨᠢᠨ ᠮᠢᠬ᠎ᠠ', pinyin: 'kho-nin mi-kha', translation: { zh: '羊肉', en: 'Mutton' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_03', mongolian: 'ᠪᠤᠳᠠᠭ᠎ᠠ', pinyin: 'bu-da-ga', translation: { zh: '饭 / 米饭', en: 'Meal / rice' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_04', mongolian: 'ᠭᠤᠯᠢᠷ', pinyin: 'gu-lir', translation: { zh: '面条', en: 'Noodles' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_05', mongolian: 'ᠴᠠᠢ', pinyin: 'chai', translation: { zh: '茶', en: 'Tea' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_06', mongolian: 'ᠰᠦ᠋', pinyin: 'su', translation: { zh: '牛奶', en: 'Milk' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_07', mongolian: 'ᠰᠦ᠋ ᠲᠡᠶ ᠴᠡᠢ', pinyin: 'su-tei chai', translation: { zh: '奶茶', en: 'Milk tea' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_08', mongolian: 'ᠠᠷᠢᠬᠢ', pinyin: 'a-ri-khi', translation: { zh: '酒', en: 'Alcohol' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_09', mongolian: 'ᠤᠰᠤ', pinyin: 'woos', translation: { zh: '水', en: 'Water' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_10', mongolian: 'ᠴᠠᠳᠬᠤ', pinyin: 'cha-d-khu', translation: { zh: '饱', en: 'Full' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  { id: 'fj_11', mongolian: 'ᠥᠯᠥᠰᠬᠦ', pinyin: 'o-lo-s-khu', translation: { zh: '饿', en: 'Hungry' }, theme: 'food-journey', difficulty: 1, createdAt: Date.now() },
  // 👨‍👩‍👧‍👦 家庭成员 (Family Members)
  { id: 'fm_01', mongolian: 'ᠠᠪᠤ', pinyin: 'a-bu', translation: { zh: '父亲', en: 'Father' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_02', mongolian: 'ᠡᠵᠢ', pinyin: 'e-ji', translation: { zh: '母亲', en: 'Mother' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_03', mongolian: 'ᠠᠬ᠎ᠠ', pinyin: 'a-kha', translation: { zh: '哥哥', en: 'Elder brother' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_04', mongolian: 'ᠡᠭᠡᠴᠢ', pinyin: 'e-ge-chi', translation: { zh: '姐姐 / 妹妹', en: 'Sister' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_05', mongolian: 'ᠭᠡᠷ', pinyin: 'ger', translation: { zh: '家 / 房子', en: 'Home / house' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_06', mongolian: 'ᠬᠦᠦ', pinyin: 'khuu', translation: { zh: '儿子', en: 'Son' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  { id: 'fm_07', mongolian: 'ᠬᠡᠦᠬᠡᠨ', pinyin: 'khe-u-khen', translation: { zh: '女儿', en: 'Daughter' }, theme: 'family-members', difficulty: 1, createdAt: Date.now() },
  // 🔢 数字王国 (Number Kingdom)
  { id: 'nk_01', mongolian: 'ᠨᠢᠭᠡ', pinyin: 'ni-ge', translation: { zh: '一', en: 'One' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_02', mongolian: 'ᠬᠤᠶᠡᠷ', pinyin: 'khu-yer', translation: { zh: '二', en: 'Two' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_03', mongolian: 'ᠭᠤᠷᠪᠠ', pinyin: 'gur-ba', translation: { zh: '三', en: 'Three' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_04', mongolian: 'ᠲᠦᠷᠪᠡ', pinyin: 'tur-be', translation: { zh: '四', en: 'Four' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_05', mongolian: 'ᠲᠠᠪᠤ', pinyin: 'ta-bu', translation: { zh: '五', en: 'Five' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_06', mongolian: 'ᠵᠢᠷᠭᠤᠭ᠎ᠠ', pinyin: 'jir-gu-ga', translation: { zh: '六', en: 'Six' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_07', mongolian: 'ᠲᠤᠯᠤᠭ᠎ᠠ', pinyin: 'to-lo-ga', translation: { zh: '七', en: 'Seven' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_08', mongolian: 'ᠨᠠᠢᠮᠠ', pinyin: 'nai-ma', translation: { zh: '八', en: 'Eight' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_09', mongolian: 'ᠶᠢᠰᠦ', pinyin: 'yi-su', translation: { zh: '九', en: 'Nine' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_10', mongolian: 'ᠠᠷᠪᠠ', pinyin: 'ar-ba', translation: { zh: '十', en: 'Ten' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_11', mongolian: 'ᠵᠠᠭᠤ', pinyin: 'ja-gu', translation: { zh: '百', en: 'Hundred' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_12', mongolian: 'ᠮᠢᠩᠭ᠎ᠠ', pinyin: 'ming-ga', translation: { zh: '千', en: 'Thousand' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  { id: 'nk_13', mongolian: 'ᠲᠦᠮᠡ', pinyin: 'tu-me', translation: { zh: '万', en: 'Ten thousand' }, theme: 'number-kingdom', difficulty: 1, createdAt: Date.now() },
  // 🏔️ 蒙古文化 (Mongolian Culture)
  { id: 'mc_01', mongolian: 'ᠮᠤᠩᠭᠣᠯ', pinyin: 'mong-gol', translation: { zh: '蒙古', en: 'Mongolia / Mongol' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_02', mongolian: 'ᠤᠯᠤᠰ', pinyin: 'u-lus', translation: { zh: '国家 / 祖国', en: 'Country / motherland' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_03', mongolian: 'ᠦᠨᠳᠦᠰᠦᠲᠡᠨ', pinyin: 'u-ndu-su-ten', translation: { zh: '民族', en: 'Nation' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_04', mongolian: 'ᠲᠩᠷᠢ', pinyin: 'teng-ri', translation: { zh: '腾格里 / 长生天', en: 'Tengri / eternal sky' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_05', mongolian: 'ᠮᠣᠷᠢᠨ ᠬᠤᠭᠤᠷ', pinyin: 'mo-rin khu-gur', translation: { zh: '马头琴', en: 'Morin Khuur' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_06', mongolian: 'ᠮᠣᠷᠢ ᠤᠨᠤᠬᠤ', pinyin: 'mo-ri u-nu-khu', translation: { zh: '骑马', en: 'Horse riding' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_07', mongolian: 'ᠪᠥᠬᠡ ᠪᠠᠷᠢᠯᠳᠤᠬᠤ', pinyin: 'bo-khe ba-ril-du-khu', translation: { zh: '摔跤', en: 'Wrestling' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  { id: 'mc_08', mongolian: 'ᠰᠢᠳᠡᠷ᠎ᠡ ᠲᠠᠯᠪᠢᠬᠤ', pinyin: 'si-te-re tal-be-khu', translation: { zh: '下棋', en: 'Chess playing' }, theme: 'mongolian-culture', difficulty: 1, createdAt: Date.now() },
  // 🌿 自然探索 - 动物 (Nature Exploration - Animals)
  { id: 'ne_01', mongolian: 'ᠮᠣᠷᠢ', pinyin: 'mo-ri', translation: { zh: '马', en: 'Horse' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_02', mongolian: 'ᠦᠬᠡᠷ', pinyin: 'u-kher', translation: { zh: '牛', en: 'Cattle' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_03', mongolian: 'ᠬᠤᠨᠢ', pinyin: 'khu-ni', translation: { zh: '羊', en: 'Sheep' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_04', mongolian: 'ᠢᠮᠠᠭ᠎ᠠ', pinyin: 'i-ma-ga', translation: { zh: '山羊', en: 'Goat' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_05', mongolian: 'ᠲᠡᠮᠡᠭᠡ', pinyin: 'te-me-ge', translation: { zh: '骆驼', en: 'Camel' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_06', mongolian: 'ᠨᠣᠬᠠᠶ', pinyin: 'no-khai', translation: { zh: '狗', en: 'Dog' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_07', mongolian: 'ᠮᠤᠤᠷ', pinyin: 'mu-ur', translation: { zh: '猫', en: 'Cat' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_08', mongolian: 'ᠲᠠᠤᠯᠠᠶ', pinyin: 'tau-lai', translation: { zh: '兔子', en: 'Rabbit' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_09', mongolian: 'ᠲᠡᠬᠢᠶ᠎ᠠ', pinyin: 'te-khi-ya', translation: { zh: '鸡', en: 'Chicken' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_10', mongolian: 'ᠪᠦᠷᠭᠦᠳ', pinyin: 'bur-gu-d', translation: { zh: '鹰', en: 'Eagle' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  // 🌿 自然探索 - 天气与自然 (Nature Exploration - Weather & Nature)
  { id: 'ne_11', mongolian: 'ᠣᠭᠲᠠᠷᠭᠤᠶ', pinyin: 'og-tar-gui', translation: { zh: '天空', en: 'Sky' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_12', mongolian: 'ᠨᠡᠷᠠ', pinyin: 'na-ra', translation: { zh: '太阳', en: 'Sun' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_13', mongolian: 'ᠰᠡᠷᠠ', pinyin: 'sar', translation: { zh: '月亮', en: 'Moon' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_14', mongolian: 'ᠤᠳᠤ', pinyin: 'u-du', translation: { zh: '星星', en: 'Star' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_15', mongolian: 'ᠰᠠᠯᠬᠢ', pinyin: 'sal-khi', translation: { zh: '风', en: 'Wind' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_16', mongolian: 'ᠪᠣᠷᠣᠭᠠᠨ', pinyin: 'bo-ro-gan', translation: { zh: '雨', en: 'Rain' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  { id: 'ne_17', mongolian: 'ᠴᠠᠰᠤ', pinyin: 'cha-su', translation: { zh: '雪', en: 'Snow' }, theme: 'nature-exploration', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 基础 (Advanced Comprehensive - Basics)
  { id: 'ac_01', mongolian: 'ᠪᠢ', pinyin: 'bi', translation: { zh: '我', en: 'I' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_02', mongolian: 'ᠴᠢ', pinyin: 'chi', translation: { zh: '你', en: 'You' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_03', mongolian: 'ᠲᠠ', pinyin: 'ta', translation: { zh: '您', en: 'You (polite)' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_04', mongolian: 'ᠮᠢᠨᠦ', pinyin: 'mini', translation: { zh: '我的', en: 'My' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_05', mongolian: 'ᠦᠵᠡᠬᠦ', pinyin: 'u-je-khu', translation: { zh: '看', en: 'Look' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_06', mongolian: 'ᠰᠤᠷᠤᠯᠴᠠᠬᠤ', pinyin: 'su-rul-cha-khu', translation: { zh: '学习', en: 'Learn' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_07', mongolian: 'ᠨᠣᠮ', pinyin: 'nom', translation: { zh: '书', en: 'Book' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_08', mongolian: 'ᠦᠰᠦᠭ', pinyin: 'u-sug', translation: { zh: '文字 / 字母', en: 'Writing / letter' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_09', mongolian: 'ᠨᠥᠬᠥᠷ', pinyin: 'no-hor', translation: { zh: '朋友', en: 'Friend' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_10', mongolian: 'ᠰᠠᠢᠨ', pinyin: 'sain', translation: { zh: '好', en: 'Good' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_11', mongolian: 'ᠢᠳᠡ', pinyin: 'i-de', translation: { zh: '吃', en: 'Eat' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_12', mongolian: 'ᠤᠤᠭᠤ', pinyin: 'u-u-gu', translation: { zh: '喝', en: 'Drink' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 形容词 (Adjectives)
  { id: 'ac_13', mongolian: 'ᠶᠡᠬᠡ', pinyin: 'ye-khe', translation: { zh: '大', en: 'Big' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_14', mongolian: 'ᠪᠠᠭ᠎ᠠ', pinyin: 'ba-ga', translation: { zh: '小', en: 'Small' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_15', mongolian: 'ᠰᠢᠨ᠎ᠡ', pinyin: 'si-ne', translation: { zh: '新', en: 'New' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_16', mongolian: 'ᠬᠠᠭᠤᠴᠢᠨ', pinyin: 'kha-gu-chin', translation: { zh: '旧', en: 'Old' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_17', mongolian: 'ᠤᠯᠡᠠ', pinyin: 'u-le-a', translation: { zh: '多', en: 'Many' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_18', mongolian: 'ᠴᠥᠭᠡᠨ', pinyin: 'cho-gen', translation: { zh: '少', en: 'Few' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_19', mongolian: 'ᠮᠠᠭᠤ', pinyin: 'ma-gu', translation: { zh: '坏', en: 'Bad' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 颜色 (Colors)
  { id: 'ac_20', mongolian: 'ᠴᠠᠭᠠᠨ', pinyin: 'cha-gan', translation: { zh: '白', en: 'White' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_21', mongolian: 'ᠬᠠᠷ᠎ᠠ', pinyin: 'kha-ra', translation: { zh: '黑', en: 'Black' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 人物 (People)
  { id: 'ac_22', mongolian: 'ᠬᠥᠮᠦᠨ', pinyin: 'kho-mun', translation: { zh: '人', en: 'Person' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 运动 (Sports)
  { id: 'ac_23', mongolian: 'ᠤᠰᠤᠨ ᠳ᠋ᠤ᠌ ᠤᠮᠪᠠᠬᠤ', pinyin: 'u-sun du um-ba-khu', translation: { zh: '游泳', en: 'Swimming' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 日常生活 (Daily Life)
  { id: 'ac_24', mongolian: 'ᠭᠠᠷ ᠦᠳᠡᠰᠦ', pinyin: 'gar u-de-su', translation: { zh: '手机', en: 'Mobile phone' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 方位 (Positions)
  { id: 'ac_25', mongolian: 'ᠳᠡᠭᠡᠷ᠎ᠡ', pinyin: 'de-ger-e', translation: { zh: '在上面', en: 'On / above' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  { id: 'ac_26', mongolian: 'ᠳᠣᠣᠷ᠎ᠠ', pinyin: 'do-or-a', translation: { zh: '在下面', en: 'Under / below' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
  // 🎓 进阶综合 - 地点 (Places)
  { id: 'ac_27', mongolian: 'ᠭᠠᠵᠠᠷ', pinyin: 'ga-jar', translation: { zh: '地方 / 地面', en: 'Place / ground' }, theme: 'advanced-comprehensive', difficulty: 1, createdAt: Date.now() },
];

// 智慧语录数据 - 与数据库种子数据保持一致
export const initialWisdomQuotes: WisdomQuote[] = [
  { id: 'wq_01', mongolian: 'ᠬᠦᠮᠦᠰ ᠲᠦᠷᠦ ᠪᠦᠷᠢ ᠬᠢᠭᠡᠳ ᠬᠦᠮᠦᠰ ᠲᠦᠷᠦ ᠭᠤᠶᠤ', translation: { zh: '众人拾柴火焰高', en: 'Many hands make light work' }, author: '蒙古谚语', category: 'proverb', isUserUploaded: false, createdAt: Date.now() },
  { id: 'wq_02', mongolian: 'ᠮᠣᠷᠢ ᠨᠢ ᠲᠠᠯ᠎ᠠ ᠳ᠋ᠤ᠌ ᠭᠤᠶᠤ ᠬᠦᠮᠦᠰ ᠨᠢ ᠰᠤᠳᠤᠷᠤᠨ ᠳ᠋ᠤ᠌ ᠭᠤᠶᠤ', translation: { zh: '马在草原上跑，人在学问上走', en: 'Horses run on the steppe, people walk in knowledge' }, author: '蒙古谚语', category: 'proverb', isUserUploaded: false, createdAt: Date.now() },
  { id: 'wq_03', mongolian: 'ᠡᠷᠲᠡᠭᠦ ᠬᠦᠮᠦᠰ ᠡᠷᠲᠡᠭᠦ ᠬᠦᠮᠦᠰ', translation: { zh: '团结就是力量', en: 'Unity is strength' }, author: '蒙古谚语', category: 'proverb', isUserUploaded: false, createdAt: Date.now() },
  { id: 'wq_04', mongolian: 'ᠠᠪᠤ ᠡᠵᠢ ᠨᠢ ᠪᠦᠷᠢ ᠮᠣᠷᠢ ᠨᠢ ᠬᠦᠰᠦᠨ', translation: { zh: '父母是阳光，马是翅膀', en: 'Parents are sunshine, horses are wings' }, author: '蒙古谚语', category: 'proverb', isUserUploaded: false, createdAt: Date.now() },
  { id: 'wq_05', mongolian: 'ᠨᠢᠭᠡ ᠤᠳᠠᠭᠠ ᠲᠠᠯ᠎ᠠ ᠪᠠᠷ ᠪᠠᠶᠢᠨ᠎ᠠ', translation: { zh: '一步一个脚印', en: 'One step at a time' }, author: '蒙古谚语', category: 'proverb', isUserUploaded: false, createdAt: Date.now() },
];

// 兼容旧导入名称
export { initialWisdomQuotes as wisdomQuotes };

// 主题定义
export const themes: { id: ThemeId; nameZh: string; nameEn: string; emoji: string; description: string }[] = [
  { id: 'basic-conversation', nameZh: '基本对话', nameEn: 'Basic Conversation', emoji: '💬', description: '学习日常蒙古语对话' },
  { id: 'food-journey', nameZh: '美食之旅', nameEn: 'Food Journey', emoji: '🍖', description: '探索蒙古美食词汇' },
  { id: 'family-members', nameZh: '家庭成员', nameEn: 'Family Members', emoji: '👨‍👩‍👧‍👦', description: '学习家庭成员称呼' },
  { id: 'number-kingdom', nameZh: '数字王国', nameEn: 'Number Kingdom', emoji: '🔢', description: '掌握蒙古语数字' },
  { id: 'mongolian-culture', nameZh: '蒙古文化', nameEn: 'Mongolian Culture', emoji: '🏔️', description: '了解蒙古文化传统' },
  { id: 'nature-exploration', nameZh: '自然探索', nameEn: 'Nature Exploration', emoji: '🌿', description: '探索自然与动物' },
  { id: 'advanced-comprehensive', nameZh: '进阶综合', nameEn: 'Advanced Comprehensive', emoji: '🎓', description: '综合进阶词汇学习' },
];

export const getAllThemes = () => themes;
export const getWordsByTheme = (themeId: ThemeId): Word[] => corpusWords.filter(w => w.theme === themeId);
export const getThemeById = (themeId: ThemeId) => themes.find(t => t.id === themeId);
