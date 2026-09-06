'use client';

import { useApp } from '@/context/AppContext';
import { MongolianTextSVG } from '@/components/common/MongolianText';

const alphabetImages = [
  { src: '/images/alphabet/IMG_3194.jpg', titleZh: '七个元音读写', titleEn: 'Seven Vowels' },
  { src: '/images/alphabet/IMG_3196.jpg', titleZh: '15基本辅音-N组', titleEn: 'N Consonant' },
  { src: '/images/alphabet/IMG_3197.jpg', titleZh: '15基本辅音-B组', titleEn: 'B Consonant' },
  { src: '/images/alphabet/IMG_3199.jpg', titleZh: '15基本辅音-P组', titleEn: 'P Consonant' },
  { src: '/images/alphabet/IMG_3200.jpg', titleZh: '15基本辅音-H组', titleEn: 'H Consonant' },
  { src: '/images/alphabet/IMG_3201.jpg', titleZh: '15基本辅音-G组', titleEn: 'G Consonant' },
  { src: '/images/alphabet/IMG_3202.jpg', titleZh: '15基本辅音-M组', titleEn: 'M Consonant' },
  { src: '/images/alphabet/IMG_3203.jpg', titleZh: '15基本辅音-L组', titleEn: 'L Consonant' },
  { src: '/images/alphabet/IMG_3204.jpg', titleZh: '15基本辅音-S组', titleEn: 'S Consonant' },
  { src: '/images/alphabet/IMG_3205.jpg', titleZh: '15基本辅音-Sh组', titleEn: 'Sh Consonant' },
  { src: '/images/alphabet/IMG_3206.jpg', titleZh: '15基本辅音-T组', titleEn: 'T Consonant' },
  { src: '/images/alphabet/IMG_3207.jpg', titleZh: '15基本辅音-D组', titleEn: 'D Consonant' },
  { src: '/images/alphabet/IMG_3208.jpg', titleZh: '15基本辅音-Ch组', titleEn: 'Ch Consonant' },
  { src: '/images/alphabet/IMG_3209.jpg', titleZh: '15基本辅音-J组', titleEn: 'J Consonant' },
  { src: '/images/alphabet/IMG_3210.jpg', titleZh: '15基本辅音-Y组', titleEn: 'Y Consonant' },
  { src: '/images/alphabet/IMG_3211.jpg', titleZh: '15基本辅音-R组', titleEn: 'R Consonant' },
];

// 七个元音数据
const vowels = [
  { mongolian: 'ᠠ', pinyin: 'a', nameZh: '阿', nameEn: 'a', type: '阳性 Yang' },
  { mongolian: 'ᠡ', pinyin: 'e', nameZh: '鹅', nameEn: 'e', type: '阴性 Yin' },
  { mongolian: 'ᠢ', pinyin: 'i', nameZh: '伊', nameEn: 'i', type: '中性 Neutral' },
  { mongolian: 'ᠣ', pinyin: 'o', nameZh: '奥', nameEn: 'o', type: '阳性 Yang' },
  { mongolian: 'ᠤ', pinyin: 'u', nameZh: '乌', nameEn: 'u', type: '阳性 Yang' },
  { mongolian: 'ᠥ', pinyin: 'ö', nameZh: '额', nameEn: 'ö', type: '阴性 Yin' },
  { mongolian: 'ᠦ', pinyin: 'ü', nameZh: '迂', nameEn: 'ü', type: '阴性 Yin' },
];

// 15个辅音数据
const consonants = [
  { letter: 'N', mongolian: 'ᠨ', pinyin: 'na', nameZh: '那', nameEn: 'na' },
  { letter: 'B', mongolian: 'ᠪ', pinyin: 'ba', nameZh: '巴', nameEn: 'ba' },
  { letter: 'P', mongolian: 'ᠫ', pinyin: 'pa', nameZh: '帕', nameEn: 'pa' },
  { letter: 'Q', mongolian: 'ᠬ', pinyin: 'qa', nameZh: '哈', nameEn: 'qa' },
  { letter: 'G', mongolian: 'ᠭ', pinyin: 'ga', nameZh: '嘎', nameEn: 'ga' },
  { letter: 'M', mongolian: 'ᠮ', pinyin: 'ma', nameZh: '马', nameEn: 'ma' },
  { letter: 'L', mongolian: 'ᠯ', pinyin: 'la', nameZh: '拉', nameEn: 'la' },
  { letter: 'S', mongolian: 'ᠰ', pinyin: 'sa', nameZh: '萨', nameEn: 'sa' },
  { letter: 'Sh', mongolian: 'ᠱ', pinyin: 'sha', nameZh: '沙', nameEn: 'sha' },
  { letter: 'T', mongolian: 'ᠲ', pinyin: 'ta', nameZh: '塔', nameEn: 'ta' },
  { letter: 'D', mongolian: 'ᠳ', pinyin: 'da', nameZh: '达', nameEn: 'da' },
  { letter: 'Ch', mongolian: 'ᠴ', pinyin: 'cha', nameZh: '查', nameEn: 'cha' },
  { letter: 'J', mongolian: 'ᠵ', pinyin: 'ja', nameZh: '扎', nameEn: 'ja' },
  { letter: 'Y', mongolian: 'ᠶ', pinyin: 'ya', nameZh: '雅', nameEn: 'ya' },
  { letter: 'R', mongolian: 'ᠷ', pinyin: 'ra', nameZh: '然', nameEn: 'ra' },
];

export default function AlphabetPage() {
  const { t, language } = useApp();
  const isZh = language === 'zh';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 pb-24">
      {/* Hero Section — 紧凑化（移动优先） */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white py-5 sm:py-7 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold mb-1">
            {t('蒙古语字母表', 'Mongolian Alphabet')}
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm">
            {t('7个元音 + 15个辅音 + 位置变写', '7 Vowels + 15 Consonants + Positional Forms')}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Vowels Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">7</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('七个元音', 'Seven Vowels')}</h2>
              <p className="text-sm text-slate-500">{t('蒙古语核心元音体系', 'Core Vowel System')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3">
            {vowels.map((vowel, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-2 sm:p-3 text-center border border-emerald-100 hover:shadow-md transition-shadow"
              >
                <MongolianTextSVG
                  mode="vertical"
                  size="md"
                  bold
                  className="text-emerald-700 mb-1"
                >
                  {vowel.mongolian}
                </MongolianTextSVG>
                <div className="font-bold text-slate-800 text-sm leading-tight">{vowel.pinyin}</div>
                <div className="text-[11px] sm:text-xs text-slate-600 leading-tight truncate">{isZh ? vowel.nameZh : vowel.nameEn}</div>
                <div className={`text-[10px] mt-0.5 px-1.5 py-0 rounded-full inline-block ${
                  vowel.type.includes('阳')
                    ? 'bg-orange-100 text-orange-600'
                    : vowel.type.includes('阴')
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {isZh ? vowel.type : vowel.type === '阳性 Yang' ? 'Yang' : vowel.type === '阴性 Yin' ? 'Yin' : 'Neutral'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100">
            <h3 className="font-bold text-amber-800 mb-2">{t('元音属性说明', 'Vowel Harmony')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-orange-400 rounded-full mt-1 shrink-0"></span>
                <div>
                  <span className="font-medium text-orange-700">{t('阳性元音', 'Yang Vowels')}</span>
                  <span className="text-orange-600 ml-1">a, o, u</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-blue-400 rounded-full mt-1 shrink-0"></span>
                <div>
                  <span className="font-medium text-blue-700">{t('阴性元音', 'Yin Vowels')}</span>
                  <span className="text-blue-600 ml-1">e, ö, ü</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full mt-1 shrink-0"></span>
                <div>
                  <span className="font-medium text-gray-700">{t('中性元音', 'Neutral Vowel')}</span>
                  <span className="text-gray-600 ml-1">i</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Consonants Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-2xl font-bold">15</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('十五个辅音', 'Fifteen Consonants')}</h2>
              <p className="text-sm text-slate-500">{t('蒙古语基础辅音字母', 'Basic Consonants')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
            {consonants.map((consonant, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-1.5 sm:p-2.5 text-center border border-purple-100 hover:shadow-md transition-shadow"
              >
                <MongolianTextSVG
                  mode="vertical"
                  size="sm"
                  bold
                  className="text-indigo-700 mb-0.5"
                >
                  {consonant.mongolian}
                </MongolianTextSVG>
                <div className="font-bold text-slate-800 text-sm leading-tight">{consonant.letter}</div>
                <div className="text-[10px] sm:text-xs text-slate-600 leading-tight truncate">{isZh ? consonant.nameZh : consonant.nameEn}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Learning Guide */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('书写规则', 'Writing Rules')}</h2>
              <p className="text-sm text-slate-500">{t('蒙古文位置变写规律', 'Positional Writing Rules')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100">
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold">首</span>
              </div>
              <h3 className="font-bold text-emerald-800 mb-2">{t('词首形式', 'Word Initial')}</h3>
              <p className="text-sm text-emerald-700">
                {isZh
                  ? '元音在词开头的形态，通常是简化的起笔式，便于和后面的字母连写'
                  : 'Vowel at the beginning of a word, usually simplified for connecting with following letters'
                }
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-100">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold">中</span>
              </div>
              <h3 className="font-bold text-blue-800 mb-2">{t('词中形式', 'Word Medial')}</h3>
              <p className="text-sm text-blue-700">
                {isZh
                  ? '元音在词中间的形态，变得更加简洁，融入整体的连写结构'
                  : 'Vowel in the middle of a word, simplified to fit into the continuous writing structure'
                }
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center mb-3">
                <span className="text-white font-bold">尾</span>
              </div>
              <h3 className="font-bold text-amber-800 mb-2">{t('词尾形式', 'Word Final')}</h3>
              <p className="text-sm text-amber-700">
                {isZh
                  ? '元音在词末尾的形态，通常回归原型的收尾结构，部分保留小尾巴'
                  : 'Vowel at the end of a word, usually returns to the original ending structure'
                }
              </p>
            </div>
          </div>
        </section>

        {/* Reference Images */}
        <section className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t('字母参考图', 'Alphabet Reference Charts')}</h2>
              <p className="text-sm text-slate-500">{t('点击查看大图', 'Click to view larger')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {alphabetImages.map((img, index) => (
              <div
                key={index}
                className="group relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => {
                  const dialog = document.getElementById(`img-dialog-${index}`) as HTMLDialogElement;
                  if (dialog) dialog.showModal();
                }}
              >
                <img
                  src={img.src}
                  alt={isZh ? img.titleZh : img.titleEn}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-white font-medium text-sm">
                    {isZh ? img.titleZh : img.titleEn}
                  </p>
                </div>
                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* Image Dialogs */}
          {alphabetImages.map((img, index) => (
            <dialog
              key={index}
              id={`img-dialog-${index}`}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] p-4 max-w-4xl mx-auto rounded-2xl"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  (e.currentTarget as HTMLDialogElement).close();
                }
              }}
            >
              <div className="flex flex-col items-center justify-center min-h-full">
                <img
                  src={img.src}
                  alt={isZh ? img.titleZh : img.titleEn}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
                <p className="text-white text-center mt-4 font-medium">
                  {isZh ? img.titleZh : img.titleEn}
                </p>
                <button
                  className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                  onClick={(e) => {
                    const dialog = (e.target as HTMLElement).closest('dialog');
                    if (dialog) dialog.close();
                  }}
                >
                  {t('关闭', 'Close')}
                </button>
              </div>
            </dialog>
          ))}
        </section>

        {/* Tips Section */}
        <section className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">{t('学习提示', 'Learning Tips')}</h3>
              <ul className="space-y-2 text-emerald-50 text-sm">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-white rounded-full mt-1.5 shrink-0"></span>
                  {isZh
                    ? '蒙古文是竖排书写的文字，从左到右阅读'
                    : 'Mongolian script is written vertically and read from left to right'
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-white rounded-full mt-1.5 shrink-0"></span>
                  {isZh
                    ? '同一个字母在词首、词中、词尾的形态可能不同'
                    : 'The same letter may have different forms at word beginning, middle, and end'
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-white rounded-full mt-1.5 shrink-0"></span>
                  {isZh
                    ? '元音和谐是蒙古语的重要特征，阳性和阴性元音一般不混用'
                    : 'Vowel harmony is an important feature of Mongolian; Yang and Yin vowels generally do not mix'
                  }
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-white rounded-full mt-1.5 shrink-0"></span>
                  {isZh
                    ? '建议结合参考图和实际书写练习来掌握字母形态'
                    : 'It is recommended to practice writing while referring to the charts'
                  }
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
