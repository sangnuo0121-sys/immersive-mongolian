'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { AIMessage, Word, WisdomQuote } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GraduationCap, Send, Bot, User, Trash2, ChevronDown, Sparkles, Volume2 } from 'lucide-react';
import { MongolianText } from '@/components/common/MongolianText';

// ==================== 对话模式类型 ====================
type AIMode = 'conversation' | 'teaching' | 'correction';

// ==================== 对话数据结构 ====================
interface ParsedResponse {
  mongolian: string;      // 蒙古文句子
  meaning: string;         // 简短英文解释
  encouragement?: string; // 鼓励语（可选）
  isCorrect?: boolean;    // 纠错模式下是否正确
  correction?: string;     // 正确版本（纠错模式下）
}

// ==================== 教学语料库 ====================
const TEACHING_PHRASES: Record<string, ParsedResponse> = {
  hello: {
    mongolian: 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ ᠤᠤ',
    meaning: 'Hello (Literally: Are you well?)',
    encouragement: 'Classic greeting! Try asking someone this.',
  },
  goodbye: {
    mongolian: 'ᠪᠠᠶᠠᠷᠲᠠᠢ',
    meaning: 'Goodbye! (Literally: May peace be with you)',
  },
  thank_you: {
    mongolian: 'ᠪᠠᠶᠠᠷᠯᠠᠯ᠎ᠠ',
    meaning: 'Thank you!',
  },
  yes: {
    mongolian: 'ᠲᠢ',
    meaning: 'Yes',
  },
  no: {
    mongolian: 'ᠤᠤᠤ',
    meaning: 'No',
  },
  please: {
    mongolian: 'ᠳᠤᠭᠠᠯᠠᠭᠤᠷᠠᠭᠤᠯᠠ',
    meaning: 'Please (used when offering something)',
  },
  good: {
    mongolian: 'ᠰᠠᠢᠨ',
    meaning: 'Good / Well',
  },
  not_good: {
    mongolian: 'ᠰᠠᠢᠨ ᠤᠤ',
    meaning: 'Not good',
  },
  i_understand: {
    mongolian: 'ᠪᠢ ᠪᠤᠳᠤᠭᠠᠴᠢᠯᠠᠭᠤᠷ᠎ᠠ',
    meaning: 'I understand',
  },
  i_dont_understand: {
    mongolian: 'ᠪᠢ ᠪᠤᠳᠤᠭᠠᠴᠢᠯᠠᠭᠤᠷ᠎ᠠ ᠤᠤ',
    meaning: "I don't understand",
  },
  what_is_your_name: {
    mongolian: 'ᠴᠢᠤᠤ ᠨ᠎ᠠ ᠪᠠᠢᠭᠠᠷᠤᠭᠤ',
    meaning: 'What is your name?',
  },
  my_name_is: {
    mongolian: 'ᠪᠢᠨ ᠨ᠎ᠠ ᠨᠣᠮᠤ',
    meaning: 'My name is...',
  },
  where: {
    mongolian: 'ᠬᠡᠳᠦ',
    meaning: 'Where?',
  },
  who: {
    mongolian: 'ᠬᠡᠨ',
    meaning: 'Who?',
  },
  when: {
    mongolian: 'ᠬᠡᠶ᠎ᠡ',
    meaning: 'When?',
  },
  how: {
    mongolian: 'ᠬᠡᠮᠵᠢᠭᠦᠷ',
    meaning: 'How?',
  },
  what: {
    mongolian: '� юᠤ',
    meaning: 'What?',
  },
  eat: {
    mongolian: 'ᠴᠠᠬᠤ',
    meaning: 'To eat',
  },
  drink: {
    mongolian: 'ᠤᠤᠯ',
    meaning: 'To drink',
  },
  water: {
    mongolian: 'ᠤᠤᠳ',
    meaning: 'Water',
  },
  tea: {
    mongolian: 'ᠴᠠᠢ',
    meaning: 'Tea',
  },
  horse: {
    mongolian: 'ᠮᠤᠤᠰ',
    meaning: 'Horse (Mongolians are famous for horses!)',
  },
};

// ==================== 欢迎语料库 ====================
const GREETING_RESPONSES: Record<string, ParsedResponse[]> = {
  hello: [
    {
      mongolian: 'ᠤᠳᠤᠷ！ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ',
      meaning: 'Hello! How are you?',
      encouragement: "Let's start chatting!",
    },
  ],
  how_are_you: [
    {
      mongolian: 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ',
      meaning: "I'm well / How are you?",
      encouragement: 'Great! Ready to practice Mongolian?',
    },
  ],
  thank_you: [
    {
      mongolian: 'ᠭ᠎ᠠᠴ᠊ᠢ！ᠤᠤᠤ',
      meaning: "You're welcome! No problem!",
      encouragement: 'What else would you like to learn?',
    },
  ],
  goodbye: [
    {
      mongolian: 'ᠪᠤᠷᠢᠯ᠎ᠠ！ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ',
      meaning: 'Goodbye! Be well!',
      encouragement: 'See you next time! Keep practicing!',
    },
  ],
};

// ==================== 随机鼓励语 ====================
const ENCOURAGEMENTS = [
  "Try saying it out loud!",
  "Your turn!",
  "Say it in Mongolian!",
  "Go ahead, try!",
  "Now you try!",
  "Give it a shot!",
  "Speak it out!",
];

const getRandomEncouragement = () => 
  ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];

// ==================== 辅助函数 ====================

// 检测输入是否包含蒙古文
function containsMongolian(text: string): boolean {
  const mongolianRegex = /[\u1800-\u18AA]/;
  return mongolianRegex.test(text);
}

// 检测是否为打招呼
function detectGreeting(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.match(/^(hello|hi|hey|hola|privet|bonjour)/)) return 'hello';
  if (lower.includes('你好') || lower.includes('您好')) return 'hello';
  if (lower.includes('how are you') || lower.includes('你好吗')) return 'how_are_you';
  if (lower.includes('thank') || lower.includes('谢谢')) return 'thank_you';
  if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('再见')) return 'goodbye';
  return null;
}

// 检测是否为教学请求
function detectTeachingRequest(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('how to say') || lower.includes('怎么读') || lower.includes('怎么说')) return 'teach_greeting';
  if (lower.includes('what is') || lower.includes('什么意思') || lower.includes('means')) return 'teach_meaning';
  if (lower.includes('teach me') || lower.includes('教我')) return 'teach_basic';
  if (lower.includes('learn') && (lower.includes('word') || lower.includes('词汇') || lower.includes('词'))) return 'teach_vocabulary';
  if (lower.includes('number') || lower.includes('数字')) return 'teach_number';
  if (lower.includes('family') || lower.includes('家庭')) return 'teach_family';
  return null;
}

// 检测蒙古文是否为有效词（简单匹配）
function isValidMongolian(text: string): boolean {
  // 检查是否包含连续的蒙古文字符
  const mongolianChars = text.match(/[\u1800-\u18AA]+/g);
  return mongolianChars !== null && mongolianChars.length > 0 && mongolianChars[0].length >= 2;
}

// ==================== 主组件 ====================
export function AIPage() {
  const { t, language, words, addXP } = useApp();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMongolian = 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ！';
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: language === 'zh'
            ? `👋 你好！我是你的蒙古语陪练伙伴！

我能帮你：
• 练习日常对话
• 学习新词汇
• 纠正发音和语法

🎯 ${welcomeMongolian}
→ 你好吗？

👉 用蒙古语回答我试试！`
            : `👋 Hi! I'm your Mongolian conversation partner!

I can help you:
• Practice daily conversations
• Learn new phrases
• Correct your pronunciation and grammar

🎯 ${welcomeMongolian}
→ How are you?

👉 Try answering in Mongolian!`,
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 隐藏建议（用户发送消息后）
  useEffect(() => {
    const hasUserMessage = messages.some(m => m.role === 'user');
    if (hasUserMessage) {
      setShowSuggestions(false);
    }
  }, [messages]);

  // 清空对话
  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    inputRef.current?.focus();
    // 重新初始化欢迎语
    setTimeout(() => {
      const welcomeMongolian = 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ！';
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: language === 'zh'
          ? `👋 你好！我是你的蒙古语陪练伙伴！

我能帮你：
• 练习日常对话
• 学习新词汇
• 纠正发音和语法

🎯 ${welcomeMongolian}
→ 你好吗？

👉 用蒙古语回答我试试！`
          : `👋 Hi! I'm your Mongolian conversation partner!

I can help you:
• Practice daily conversations
• Learn new phrases
• Correct your pronunciation and grammar

🎯 ${welcomeMongolian}
→ How are you?

👉 Try answering in Mongolian!`,
        timestamp: Date.now(),
      }]);
    }, 100);
  };

  // ==================== 生成 AI 回复 ====================
  const generateAIResponse = useCallback((userQuery: string, lang: 'zh' | 'en'): string => {
    const lowerQuery = userQuery.toLowerCase().trim();

    // ==================== 模式1: 蒙古文输入 → 纠错模式 ====================
    if (containsMongolian(userQuery)) {
      const hasMongolian = isValidMongolian(userQuery);
      
      if (hasMongolian) {
        // 检查是否匹配已知短语
        const matchedPhrase = Object.entries(TEACHING_PHRASES).find(([key, phrase]) => 
          phrase.mongolian === userQuery.trim() || 
          userQuery.trim().includes(phrase.mongolian)
        );

        if (matchedPhrase) {
          // 用户说的正确！
          const [, phrase] = matchedPhrase;
          return lang === 'zh'
            ? `✅ 太棒了！说得很对！

🎯 ${phrase.mongolian}
→ ${phrase.meaning}

${phrase.encouragement || getRandomEncouragement()}`
            : `✅ Great job! That's correct!

🎯 ${phrase.mongolian}
→ ${phrase.meaning}

${phrase.encouragement || getRandomEncouragement()}`;
        } else {
          // 用户尝试说了蒙古语，但不完全匹配
          // 尝试找到最接近的
          let bestMatch: [string, ParsedResponse] | null = null;
          let bestScore = 0;

          for (const [key, phrase] of Object.entries(TEACHING_PHRASES)) {
            const similarity = calculateSimilarity(userQuery.trim(), phrase.mongolian);
            if (similarity > bestScore && similarity > 0.5) {
              bestScore = similarity;
              bestMatch = [key, phrase];
            }
          }

          if (bestMatch) {
            const [key, phrase] = bestMatch;
            return lang === 'zh'
              ? `👍 不错的尝试！

更标准的说法是：
🎯 ${phrase.mongolian}
→ ${phrase.meaning}

再试试？或者告诉我你想说什么！`
              : `👍 Good try!

The more standard way to say it:
🎯 ${phrase.mongolian}
→ ${phrase.meaning}

Try again? Or tell me what you want to say!`;
          }

          // 完全无法匹配
          return lang === 'zh'
            ? `有意思！你说了蒙古语！

我帮你查一下词库... 

这个表达我还不会，但我们可以用罗马字交流来练习！

👉 你想用蒙古语说什么？`
            : `Interesting! You said something in Mongolian!

Let me check the archive...

I'm still learning this expression, but we can practice with what we know!

👉 What would you like to say in Mongolian?`;
        }
      }
    }

    // ==================== 模式2: 打招呼 ====================
    const greetingType = detectGreeting(userQuery);
    if (greetingType && GREETING_RESPONSES[greetingType]) {
      const responses = GREETING_RESPONSES[greetingType];
      const response = responses[Math.floor(Math.random() * responses.length)];
      return lang === 'zh'
        ? `😊 ${response.mongolian}
→ ${response.meaning}

${response.encouragement || getRandomEncouragement()}`
        : `😊 ${response.mongolian}
→ ${response.meaning}

${response.encouragement || getRandomEncouragement()}`;
    }

    // ==================== 模式3: 教学请求 ====================
    const teachingType = detectTeachingRequest(userQuery);
    if (teachingType) {
      if (teachingType === 'teach_greeting') {
        return lang === 'zh'
          ? `👋 你可以这样说：

🎯 ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ
→ 你好吗？/ How are you?

👉 现在轮到你啦！试着说"ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ"！`
          : `👋 You can say:

🎯 ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ
→ How are you?

👉 Now it's your turn! Try saying "ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ"!`;
      }
      if (teachingType === 'teach_meaning') {
        return lang === 'zh'
          ? `📖 告诉我你想知道哪个词的意思？

比如："ᠮᠤᠤᠰ"是什么意思？
→ 我会告诉你答案！`
          : `📖 Tell me which word you want to know!

For example: "What does ᠮᠤᠤᠰ mean?"
→ I'll tell you the answer!`;
      }
      if (teachingType === 'teach_basic') {
        return lang === 'zh'
          ? `📚 好！先从最基本的开始：

你好 → ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ
再见 → ᠪᠤᠷᠢᠯ᠎ᠠ
谢谢 → ᠭ᠎ᠠᠴ᠊ᠢ
是   → ᠲᠢ
不是 → ᠤᠤᠤ

👉 想学哪个？或者直接用蒙古语跟我说！`
          : `📚 Sure! Let's start with the basics:

Hello → ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ
Goodbye → ᠪᠤᠷᠢᠯ᠎ᠠ
Thank you → ᠭ᠎ᠠᠴ᠊ᠢ
Yes → ᠲᠢ
No → ᠤᠤᠤ

👉 Which one? Or just say something in Mongolian to me!`;
      }
      if (teachingType === 'teach_vocabulary') {
        const sampleWords = words.slice(0, 5);
        if (sampleWords.length > 0) {
          const wordList = sampleWords.map(w => `• ${w.mongolian} = ${w.translation[lang]}`).join('\n');
          return lang === 'zh'
            ? `📖 词库里有 ${words.length} 个词条！比如：

${wordList}

👉 问我任何一个词的意思！`
            : `📖 The archive has ${words.length} words! For example:

${wordList}

👉 Ask me about any word!`;
        }
      }
      if (teachingType === 'teach_number') {
        return lang === 'zh'
          ? `🔢 蒙古语数字：

一 → ᠨᠢᠭᠡ
二 → ᠬᠤᠶᠠᠷ
三 → ᠭᠤᠷᠪᠠ
四 → ᠳᠦᠷᠦᠭᠡ
五 → ᠲᠠᠲᠤ

👉 数到五用蒙古语怎么说？试试！`
          : `🔢 Mongolian numbers:

One → ᠨᠢᠭᠡ
Two → ᠬᠤᠶᠠᠷ
Three → ᠭᠤᠷᠪᠠ
Four → ᠳᠦᠷᠦᠭᠡ
Five → ᠲᠠᠲᠤ

👉 Can you count to five in Mongolian? Try it!`;
      }
      if (teachingType === 'teach_family') {
        return lang === 'zh'
          ? `👨‍👩‍👧‍👦 家庭称谓：

妈妈 → ᠡᠮᠡ
爸爸 → ᠠᠪ
哥哥/弟弟 → ᠠᠭᠤᠭ᠎ᠠ
姐姐/妹妹 → ᠡᠭᠤᠳᠤ
马 → ᠮᠤᠤᠰ

👉 你想用蒙古语介绍你的家人吗？`
          : `👨‍👩‍👧‍👦 Family terms:

Mother → ᠡᠮᠡ
Father → ᠠᠪ
Brother → ᠠᠭᠤᠭ᠎ᠠ
Sister → ᠡᠭᠤᠳᠤ
Horse → ᠮᠤᠤᠰ

👉 Would you like to introduce your family in Mongolian?`;
      }
    }

    // ==================== 模式4: 普通对话 ====================
    // 不再使用词库搜索，而是生成自然的对话回复

    // 检查用户是否在提问
    if (lowerQuery.includes('?') || lowerQuery.includes('？')) {
      return lang === 'zh'
        ? `🤔 好问题！

你想了解蒙古语的什么呢？

• 发音规则？
• 某个词怎么说？
• 日常对话练习？

👉 直接告诉我你想学什么！`
        : `🤔 Great question!

What would you like to know about Mongolian?

• Pronunciation rules?
• How to say something?
• Practice conversations?

👉 Just tell me what you want to learn!`;
    }

    // 检查是否提到蒙古/文化
    if (lowerQuery.includes('mongolia') || lowerQuery.includes('蒙古')) {
      return lang === 'zh'
        ? `🏔️ 蒙古是个美丽的地方！

蒙古人传统上游牧生活，住在蒙古包里（ᠮᠤᠤᠤ）。

马（ᠮᠤᠤᠰ）是蒙古人的好朋友！

👉 想学一些关于蒙古文化的词吗？`
        : `🏔️ Mongolia is a beautiful country!

Traditional Mongolians lived a nomadic life, living in yurts (ᠮᠤᠤᠤ).

Horses (ᠮᠤᠤᠰ) are Mongolian's best friends!

👉 Want to learn some Mongolian culture words?`;
    }

    // 检查是否要求练习
    if (lowerQuery.includes('practice') || lowerQuery.includes('练习')) {
      return lang === 'zh'
        ? `🗣️ 好！让我们练习！

我会说一句蒙古语，然后你用蒙古语回应我。

准备好了吗？

🎯 ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ？
→ 你好吗？

👉 用蒙古语回答我！可以说"ᠰᠠᠢᠨ"（好）或者"ᠰᠠᠢᠨ ᠤᠤ"（不好）！`
        : `🗣️ Great! Let's practice!

I'll say something in Mongolian, then you respond in Mongolian.

Ready?

🎯 ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ？
→ How are you?

👉 Respond in Mongolian! You can say "ᠰᠠᠢᠨ" (good) or "ᠰᠠᠢᠨ ᠤᠤ" (not good)!`;
    }

    // ==================== 默认回复：引导对话 ====================
    // 不再输出 corpus lookup，而是生成引导性回复
    return lang === 'zh'
      ? `😊 好的！

记住：
• 你可以输入蒙古语，我会帮你纠正
• 问我"怎么说..."，我教你
• 我们可以练习对话

👉 现在你想做什么？
• 说一句蒙古语试试？
• 问我怎么说你好？
• 我们来练习对话吧！`
      : `😊 Okay!

Remember:
• You can type in Mongolian, I'll help correct
• Ask me "how to say...", I'll teach you
• We can practice conversations

👉 What would you like to do now?
• Try saying something in Mongolian?
• Ask me how to say hello?
• Let's practice a conversation!`;

  }, [language, words]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsTyping(true);

    // 模拟 AI 思考
    setTimeout(() => {
      const aiResponse = generateAIResponse(currentInput, language);
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
      addXP('practice');
    }, 800 + Math.random() * 700);
  };

  // 朗读蒙古语
  const speakMongolian = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'mn-MN';
    speechSynthesis.speak(utterance);
  };

  // 建议问题
  const suggestedQuestions = [
    { 
      text: language === 'zh' ? 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ 你好吗？' : 'Say "How are you?" in Mongolian', 
      icon: '👋',
      insert: 'ᠰᠠᠢᠨ ᠪᠠᠢᠨ᠎ᠠ',
    },
    { 
      text: language === 'zh' ? '教我怎么说你好' : 'Teach me to say hello', 
      icon: '📚',
      insert: language === 'zh' ? '教我怎么说你好' : 'Teach me to say hello',
    },
    { 
      text: language === 'zh' ? '我们练习对话吧' : "Let's practice conversation", 
      icon: '🗣️',
      insert: language === 'zh' ? '我们练习对话吧' : "Let's practice conversation",
    },
    { 
      text: language === 'zh' ? 'ᠪᠤᠷᠢᠯ᠎ᠠ 再见' : 'Say "Goodbye" in Mongolian', 
      icon: '👋',
      insert: 'ᠪᠤᠷᠢᠯ᠎ᠠ',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t('蒙古语陪练', 'Mongolian Tutor')}
            </h1>
            <p className="text-sm text-emerald-600">
              {t('对话练习伙伴', 'Conversation Practice Partner')}
            </p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearChat}
          className="text-slate-500 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('新对话', 'New Chat')}
        </Button>
      </div>

      {/* Chat Container */}
      <Card className="border-emerald-200 shadow-lg overflow-hidden">
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="h-[calc(100vh-320px)] min-h-[400px] max-h-[600px] overflow-y-auto overflow-x-hidden bg-gradient-to-b from-emerald-50/30 to-white"
          style={{ 
            scrollBehavior: 'smooth',
          }}
        >
          <div className="p-4 pb-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 mb-4 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`
                  w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'user' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-amber-500 text-white'
                  }
                `}>
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`
                  max-w-[80%] min-w-[100px] rounded-2xl px-4 py-3
                  ${message.role === 'user' 
                    ? 'bg-emerald-500 text-white rounded-tr-sm' 
                    : 'bg-white text-slate-800 rounded-tl-sm border border-emerald-100 shadow-sm'
                  }
                `}>
                  <MessageContent content={message.content} />
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-emerald-100 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggested Questions */}
        {showSuggestions && messages.length <= 2 && (
          <div className="px-4 pb-3 border-t border-emerald-100 pt-3">
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(q.insert);
                    inputRef.current?.focus();
                  }}
                  className="text-sm px-3 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-full text-emerald-700 transition-colors border border-emerald-200 flex items-center gap-1.5"
                >
                  <span>{q.icon}</span>
                  <span className="max-w-[150px] truncate">{q.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-emerald-100 bg-white">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t(
                '输入蒙古语、中文或英文...',
                'Type in Mongolian, Chinese or English...'
              )}
              className="flex-1 border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 text-base"
              disabled={isTyping}
              maxLength={300}
            />
            <Button 
              onClick={sendMessage} 
              disabled={isTyping || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            {t(
              '💡 用蒙古语输入，我会帮你纠正！',
              '💡 Type in Mongolian and I will help correct you!'
            )}
          </p>
        </div>
      </Card>

      {/* Quick Tips */}
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-slate-500">
        <span className="px-2 py-1 bg-emerald-50 rounded-full">🗣️ 练习说蒙古语</span>
        <span className="px-2 py-1 bg-emerald-50 rounded-full">📚 问任何问题</span>
        <span className="px-2 py-1 bg-emerald-50 rounded-full">✅ 获得即时纠错</span>
      </div>
    </div>
  );
}

// ==================== 消息内容组件 ====================
function MessageContent({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        // 检测蒙古文行（包含 ᠤ, ᠭ, ᠬ 等字符）
        const isMongolianLine = /[\u1800-\u18AA]/.test(line);
        // 检测特殊格式行（如 👉, 🎯 等开头）
        const isSpecialLine = /^[👉🎯✅👍😊🤔🏔️📚🗣️]/.test(line.trim());
        // 检测引导语
        const isPromptLine = /👉|try|say|your turn|now you/i.test(line);

        return (
          <p 
            key={idx} 
            className={`
              whitespace-pre-wrap break-words leading-relaxed
              ${isMongolianLine ? 'font-mongolian text-base' : ''}
              ${isSpecialLine && !isMongolianLine ? 'text-emerald-600' : ''}
              ${isPromptLine ? 'text-emerald-600 font-medium' : ''}
            `}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

// ==================== 辅助函数：计算相似度 ====================
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const longerLength = longer.length;
  const editDistance = levenshteinDistance(longer, shorter);
  
  return (longerLength - editDistance) / longerLength;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
