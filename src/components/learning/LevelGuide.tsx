'use client';

import { useState, useEffect, CSSProperties } from 'react';
import { LEVEL_TITLES } from '@/types';
import { useApp } from '@/context/AppContext';

interface LevelGuideProps {
  onClose: () => void;
}

// 自定义滚动条样式
const scrollbarStyles: CSSProperties = {
  scrollbarWidth: 'thin',
  scrollbarColor: '#94a3b8 #f1f5f9',
};

// 滚动条样式注入
const injectScrollbarStyles = `
  .level-guide-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .level-guide-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .level-guide-scroll::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 4px;
  }
  .level-guide-scroll::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
`;

// 等级图鉴组件
export function LevelGuide({ onClose }: LevelGuideProps) {
  const { t, language, xpState, getLevelProgress } = useApp();
  
  // 计算每个等级所需的经验值（取自 LEVEL_TITLES.minXp 唯一真理源）
  const getXPRequired = (level: number): number => {
    const title = LEVEL_TITLES.find((l) => l.level === level);
    return title?.minXp ?? 0;
  };

  // 计算等级范围
  const getLevelRange = (index: number): string => {
    const sorted = [...LEVEL_TITLES].sort((a, b) => a.level - b.level);
    const start = sorted[index]?.minXp ?? 0;
    const end = sorted[index + 1]?.minXp ?? start;
    if (index === sorted.length - 1) return `${start} XP 起`;
    return `${start} - ${end} XP`;
  };
  
  // 锁定背景滚动
  useEffect(() => {
    // 保存原始 overflow
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalWidth = document.body.style.width;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;

    // 锁定滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';
    document.body.style.left = '0';

    return () => {
      // 恢复原始滚动状态
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.width = originalWidth;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
    };
  }, []);
  
  return (
    <>
      {/* 注入滚动条样式 */}
      <style>{injectScrollbarStyles}</style>
      
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* 弹窗内容 */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {language === 'zh' ? '等级图鉴' : 'Level Guide'}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {language === 'zh' 
                  ? '探索你的蒙古语学习旅程' 
                  : 'Explore your Mongolian learning journey'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>
        
        {/* 等级列表 - 支持滚动 */}
        <div 
          className="level-guide-scroll p-4 md:p-6 overflow-y-auto"
          style={{ 
            maxHeight: 'clamp(400px, 70vh, 700px)',
            ...scrollbarStyles 
          }}
        >
          <div className="grid gap-4">
            {LEVEL_TITLES.map((level, index) => {
              const isUnlocked = xpState.level >= level.level;
              const isCurrent = xpState.level === level.level;
              const xpRequired = getXPRequired(level.level);
              
              return (
                <div
                  key={level.level}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-300
                    ${isCurrent 
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200' 
                      : isUnlocked 
                        ? 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md' 
                        : 'border-slate-100 bg-slate-50 opacity-70'
                    }
                  `}
                >
                  {/* 当前等级标记 */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                      {language === 'zh' ? '当前等级' : 'Current Level'}
                    </div>
                  )}
                  
                  {/* 锁定标记 */}
                  {!isUnlocked && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                      <span className="text-slate-500">🔒</span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-4">
                    {/* 等级图标 */}
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{ 
                        backgroundColor: isUnlocked ? `${level.color}20` : '#f1f5f9',
                        border: `2px solid ${isUnlocked ? level.color : '#e2e8f0'}`
                      }}
                    >
                      {level.icon}
                    </div>
                    
                    {/* 等级信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* 等级名称 - 主文案 */}
                        <h3 
                          className={`text-xl font-bold ${isUnlocked ? '' : 'text-slate-400'}`}
                          style={isUnlocked ? { color: level.color } : {}}
                        >
                          {language === 'zh' 
                            ? (isUnlocked ? level.nameZh : '???')
                            : (isUnlocked ? level.nameEn : '???')
                          }
                        </h3>
                        
                        {/* 等级编号 */}
                        <span className={`
                          px-2 py-0.5 rounded-full text-xs font-medium
                          ${isCurrent 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : isUnlocked 
                              ? 'bg-slate-100 text-slate-600' 
                              : 'bg-slate-100 text-slate-400'
                          }
                        `}>
                          Lv.{level.level}
                        </span>
                      </div>
                      
                      {/* 等级名称 - 辅文案 */}
                      {isUnlocked && (
                        <p className={`text-sm mt-1 ${language === 'zh' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {language === 'zh' ? level.nameEn : level.nameZh}
                        </p>
                      )}
                      
                      {/* 等级描述 */}
                      <p className={`text-sm mt-2 ${isUnlocked ? 'text-slate-600' : 'text-slate-400'}`}>
                        {language === 'zh' ? level.description.zh : level.description.en}
                      </p>
                      
                      {/* 经验值进度 */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>
                            {language === 'zh' ? '升级所需' : 'XP Required'}
                          </span>
                          <span>{xpRequired} XP</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: isCurrent ? `${getLevelProgress()}%` : (isUnlocked ? '100%' : '0%'),
                              backgroundColor: isUnlocked ? level.color : '#94a3b8'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 经验范围指示 */}
                  <div className={`
                    mt-3 pt-3 border-t text-xs text-center
                    ${isCurrent ? 'border-emerald-200 text-emerald-600' : 'border-slate-100 text-slate-400'}
                  `}>
                    {getLevelRange(index)}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* 解锁权益说明 */}
          <div className="mt-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <h4 className="font-bold text-amber-800 flex items-center gap-2">
              <span>🏆</span>
              {language === 'zh' ? '等级权益' : 'Level Benefits'}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-amber-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                {language === 'zh' 
                  ? '更高等级解锁更多学习内容' 
                  : 'Higher levels unlock more learning content'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                {language === 'zh' 
                  ? '每升一级获得成就徽章' 
                  : 'Earn achievement badges with each level up'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500">✓</span>
                {language === 'zh' 
                  ? '持续学习保持连续天数奖励' 
                  : 'Maintain streak rewards with consistent learning'}
              </li>
            </ul>
          </div>
          
          {/* 如何获得 XP */}
          <div className="mt-4 p-5 bg-slate-50 rounded-xl">
            <h4 className="font-bold text-slate-700 flex items-center gap-2">
              <span>⚡</span>
              {language === 'zh' ? '如何获得经验值' : 'How to Earn XP'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
              {[
                { action: language === 'zh' ? '学习单词' : 'Learn words', xp: '+10' },
                { action: language === 'zh' ? '听力训练' : 'Listening', xp: '+8' },
                { action: language === 'zh' ? '复习任务' : 'Review', xp: '+6' },
                { action: language === 'zh' ? '挑战练习' : 'Challenge', xp: '+7' },
                { action: language === 'zh' ? '完成每日目标' : 'Daily goal', xp: '+20' },
                { action: language === 'zh' ? '上传词条' : 'Upload word', xp: '+15' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg">
                  <span className="text-sm text-slate-600">{item.action}</span>
                  <span className="text-sm font-bold text-emerald-600">{item.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

// 首页等级图鉴入口按钮
export function LevelGuideButton() {
  const { language } = useApp();
  const [showGuide, setShowGuide] = useState(false);
  
  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="w-full py-3 px-4 bg-white/80 hover:bg-white text-slate-700 rounded-xl 
                   border border-slate-200 hover:border-emerald-300 transition-all
                   flex items-center justify-center gap-2 shadow-sm"
      >
        <span className="text-lg">📜</span>
        <span className="font-medium">
          <span className="hidden sm:inline">
            {typeof window !== 'undefined' && language === 'en' 
              ? 'Level Guide & XP Rules' 
              : '等级图鉴 & 经验规则'
            }
          </span>
          <span className="sm:hidden">
            {typeof window !== 'undefined' && language === 'en' 
              ? 'Levels' 
              : '等级'
            }
          </span>
        </span>
        <span className="text-slate-400">›</span>
      </button>
      
      {showGuide && <LevelGuide onClose={() => setShowGuide(false)} />}
    </>
  );
}
