/**
 * 蒙古传统色板
 * 基于草原、奶白毡毯、萨满祭礼、哈那木架等意象提炼。
 * 4 套主题色对应 4 种公告类型（info / warning / success / update）
 */

export type MongolianType = 'info' | 'warning' | 'success' | 'update';

export interface MongolianColorPalette {
  // 卡片背景渐变
  gradient: string;
  // 顶部细条
  stripe: string;
  // 徽章底色
  badge: string;
  // 标题文字色
  accentText: string;
  // 边框色
  border: string;
  // 对应主色 hex
  primary: string;
  primaryDark: string;
  // 装饰主色（用于 SVG 描边/填充）
  decor: string;
  decorSoft: string;
  // 蒙文含义
  mongolian: string;
  transliteration: string;
  meaning: string;
}

export const MONGOLIAN_PALETTES: Record<MongolianType, MongolianColorPalette> = {
  info: {
    gradient: 'from-[#E8EEF4] via-[#DDE6F0] to-[#D4DEE9]',
    stripe: 'from-[#3D5A80] via-[#4A6B95] to-[#5A7BA5]',
    badge: 'bg-[#DDE6F0] text-[#2C4A6B] border-[#B8C7D9]',
    accentText: 'text-[#2C4A6B]',
    border: 'border-[#B8C7D9]',
    primary: '#3D5A80',
    primaryDark: '#2C4A6B',
    decor: '#3D5A80',
    decorSoft: '#7B97B5',
    mongolian: 'ᠮᠡᠳᠡᠭᠡ',
    transliteration: 'medege',
    meaning: '蒙蓝·信息',
  },
  warning: {
    gradient: 'from-[#F5EDDC] via-[#EFE5CC] to-[#E8DCBC]',
    stripe: 'from-[#C9A24A] via-[#B8893D] to-[#A87B33]',
    badge: 'bg-[#F0E2BD] text-[#8B6429] border-[#D4B97A]',
    accentText: 'text-[#8B6429]',
    border: 'border-[#D4B97A]',
    primary: '#C9A24A',
    primaryDark: '#8B6429',
    decor: '#B8893D',
    decorSoft: '#D4B97A',
    mongolian: 'ᠰᠡᠷᠭᠡᠭᠦᠯᠡᠨ',
    transliteration: 'sergegülün',
    meaning: '萨满金·提醒',
  },
  success: {
    gradient: 'from-[#E5EEE8] via-[#D5E2D9] to-[#C5D5C9]',
    stripe: 'from-[#6B8E7A] via-[#5B7C65] to-[#4A6B55]',
    badge: 'bg-[#D5E2D9] text-[#3D5544] border-[#A8BFB0]',
    accentText: 'text-[#3D5544]',
    border: 'border-[#A8BFB0]',
    primary: '#6B8E7A',
    primaryDark: '#3D5544',
    decor: '#5B7C65',
    decorSoft: '#A8BFB0',
    mongolian: 'ᠪᠠᠶᠠᠷᠯᠢᠭ',
    transliteration: 'bayarlig',
    meaning: '草原青·喜讯',
  },
  update: {
    gradient: 'from-[#EDE0E3] via-[#E5D2D6] to-[#D9C2C8]',
    stripe: 'from-[#7D4E57] via-[#6B3D45] to-[#5A2F37]',
    badge: 'bg-[#E0CFD3] text-[#5A2F37] border-[#C0A0A8]',
    accentText: 'text-[#5A2F37]',
    border: 'border-[#C0A0A8]',
    primary: '#7D4E57',
    primaryDark: '#5A2F37',
    decor: '#7D4E57',
    decorSoft: '#C0A0A8',
    mongolian: 'ᠰᠢᠯᠲᠠ',
    transliteration: 'silta',
    meaning: '紫铜·更新',
  },
};

/** 公共底色（不分类型） */
export const MONGOLIAN_BASE = {
  feltWhite: '#F5EFE3',
  feltWhiteDeep: '#EDE5D3',
  feltTexture: '#E8DEC9',
  bone: '#FAF6EC',
  ink: '#3A2E1F',
  inkSoft: '#5C4A33',
  gerWood: '#7A5A3D',
  gerWoodSoft: '#A88560',
  goldThread: '#C9A24A',
} as const;
