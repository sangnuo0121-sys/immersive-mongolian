'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { ThemeId, Word, WisdomQuote } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Sprout, Heart, Globe, Trophy, Lock } from 'lucide-react';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  type: 'word' | 'wisdom';
  onSubmitWord: (word: Omit<Word, 'id' | 'createdAt'>) => void;
  onSubmitWisdom: (quote: Omit<WisdomQuote, 'id' | 'createdAt'>) => void;
}

export function UploadModal({ open, onClose, type, onSubmitWord, onSubmitWisdom }: UploadModalProps) {
  const { t, language, themes } = useApp();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const [mongolian, setMongolian] = useState('');
  const [pinyin, setPinyin] = useState('');
  const [translationZh, setTranslationZh] = useState('');
  const [translationEn, setTranslationEn] = useState('');
  const [theme, setTheme] = useState<ThemeId>('basic-conversation');
  const [author, setAuthor] = useState('');

  const handleSubmit = () => {
    if (type === 'word') {
      if (!mongolian || (!translationZh && !translationEn)) {
        return;
      }
      onSubmitWord({
        mongolian,
        pinyin,
        translation: {
          zh: translationZh,
          en: translationEn,
        },
        theme,
      });
    } else {
      if (!mongolian || (!translationZh && !translationEn)) {
        return;
      }
      onSubmitWisdom({
        mongolian,
        translation: {
          zh: translationZh,
          en: translationEn,
        },
        author: author || undefined,
      });
    }
    
    // Reset
    setMongolian('');
    setPinyin('');
    setTranslationZh('');
    setTranslationEn('');
    setTheme('basic-conversation');
    setAuthor('');
  };

  const isWordValid = mongolian.trim() && (translationZh.trim() || translationEn.trim());
  const isWisdomValid = mongolian.trim() && (translationZh.trim() || translationEn.trim());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-emerald-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'word' ? (
              <>
                <Sprout className="w-5 h-5 text-emerald-500" />
                {t('贡献新词条', 'Contribute a New Word')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-500" />
                {t('分享智慧语录', 'Share Wisdom Quote')}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            {type === 'word' 
              ? language === 'zh'
                ? '为传统蒙古文语料库贡献力量，让更多人受益'
                : 'Contribute to the Traditional Mongolian archive and help others learn'
              : language === 'zh'
                ? '分享蒙古族传统智慧，传承文化精髓'
                : 'Share traditional Mongolian wisdom and preserve cultural heritage'
            }
          </DialogDescription>
        </DialogHeader>

        {/* 贡献说明卡片 */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-3 mb-2">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Heart className="w-4 h-4" />
            <span>
              {type === 'word'
                ? language === 'zh' ? '您贡献的词条将帮助构建更完整的语料库' : 'Your contribution helps build a more complete archive'
                : language === 'zh' ? '您分享的智慧将被永久保存并展示给学习者' : 'Your wisdom will be preserved and shared with learners'}
            </span>
          </div>
        </div>

        <div className="space-y-4 py-4">
          {/* Mongolian Input */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              {t('蒙古文', 'Mongolian')} *
            </label>
            <Input
              value={mongolian}
              onChange={(e) => setMongolian(e.target.value)}
              placeholder={t('输入蒙古文', 'Enter Mongolian text')}
              className="text-lg border-emerald-200 focus:border-emerald-500"
            />
          </div>

          {/* Pinyin (for words) */}
          {type === 'word' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('拼音标注', 'Pinyin')}
              </label>
              <Input
                value={pinyin}
                onChange={(e) => setPinyin(e.target.value)}
                placeholder={t('输入拼音（可选）', 'Enter pinyin (optional)')}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Translation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('中文翻译', 'Chinese')} *
              </label>
              <Input
                value={translationZh}
                onChange={(e) => setTranslationZh(e.target.value)}
                placeholder={t('中文意思', 'Chinese meaning')}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('英文翻译', 'English')} *
              </label>
              <Input
                value={translationEn}
                onChange={(e) => setTranslationEn(e.target.value)}
                placeholder={t('English meaning', 'English meaning')}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Theme (for words) */}
          {type === 'word' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('所属主题', 'Theme')}
              </label>
              <Select value={theme} onValueChange={(value: ThemeId) => setTheme(value)}>
                <SelectTrigger className="border-emerald-200 focus:border-emerald-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {themes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="mr-2">{t.icon}</span>
                      {language === 'zh' ? t.name.zh : t.name.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Author (for wisdom) */}
          {type === 'wisdom' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('出处/作者', 'Source/Author')}
              </label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('如：成吉思汗、民间谚语（可选）', 'e.g. Genghis Khan, Folk proverb (optional)')}
                className="border-emerald-200 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={(type === 'word' ? !isWordValid : !isWisdomValid) || authLoading || !isLoggedIn}
              title={!isLoggedIn ? t('请先登录', 'Please login first') : undefined}
              className={`w-full ${type === 'word'
                ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200'
                : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200'
              }`}
            >
              {!isLoggedIn ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  {t('请先登录', 'Please login first')}
                </>
              ) : type === 'word' ? (
                <>
                  <Sprout className="w-4 h-4 mr-2" />
                  {t('提交词条', 'Submit Word')}
                  <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    +15 XP
                  </Badge>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('提交语录', 'Submit Wisdom')}
                  <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
                    <Trophy className="w-3 h-3 mr-1" />
                    +15 XP
                  </Badge>
                </>
              )}
            </Button>
          </div>

          {/* 帮助提示 */}
          <p className="text-xs text-slate-400 text-center">
            {language === 'zh'
              ? '请确保内容准确无误，您的贡献将被永久保存'
              : 'Please ensure accuracy. Your contribution will be preserved permanently'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
