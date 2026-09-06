"use client";

import { useApp } from '@/context/AppContext';
import { XPToastHost } from './XPToastHost';

export function XPToastHostWrapper() {
  const { language } = useApp();
  return <XPToastHost language={language} />;
}
