'use client';

import { Suspense } from 'react';
import { use } from 'react';
import { LearnPage } from '@/components/learning/LearnPage';
import { ThemeId } from '@/types';
import { StudyMode } from '@/types';

export default function ThemeLearnPage({ params, searchParams }: { 
  params: Promise<{ themeId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { themeId } = use(params);
  const { mode } = use(searchParams);
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <LearnPage themeId={themeId as ThemeId} initialMode={mode as StudyMode} />
    </Suspense>
  );
}
