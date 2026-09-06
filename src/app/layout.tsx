import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Header, LevelUpModal } from '@/components/common/Header';
import { Sidebar, BottomNav } from '@/components/common/Navigation';
import { Toaster } from '@/components/ui/sonner';
import { XPToastHostWrapper } from '@/components/common/XPToastHostWrapper';
import { GuideAssistant } from '@/components/learning/GuideAssistant';

export const metadata: Metadata = {
  title: {
    default: '沉浸式学蒙古语 | Immersive Mongolian',
    template: '%s | 沉浸式学蒙古语',
  },
  description: '探索蒙古语言魅力，沉浸式学习体验。从基础对话到文化探索，开启你的蒙古语学习之旅。',
  keywords: ['蒙古语', 'Mongolian', '语言学习', 'language learning', '蒙古文化'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className="antialiased">
        <AppProvider>
          <div className="min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <Sidebar />
            
            {/* Main Content - Desktop */}
            <main className="lg:ml-60 min-h-screen">
              <Header />
              <div className="pt-6 pb-20 lg:pb-8">
                {children}
              </div>
            </main>
            
            {/* Mobile Bottom Nav */}
            <BottomNav />
            
            {/* Level Up Modal */}
            <LevelUpModal />
            
            {/* Toaster */}
            <Toaster />

            {/* XP Toast（蒙古文化主题） */}
            <XPToastHostWrapper />

            {/* 草原向导（首次访问引导 + 常驻浮动助手） */}
            <GuideAssistant />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
