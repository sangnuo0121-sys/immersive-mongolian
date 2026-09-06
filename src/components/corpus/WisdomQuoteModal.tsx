'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import { getMongolianWisdomImageSrc } from '@/lib/mongolian-image-src';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Pencil,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import type { WisdomQuote } from '@/types';

interface WisdomQuoteModalProps {
  quote: WisdomQuote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
  /**
   * 编辑/删除成功后回调（用于父组件触发 svgRefreshKey 等副作用）
   */
  onUpdated?: () => void;
}

export function WisdomQuoteModal({
  quote,
  open,
  onOpenChange,
  onDelete,
  onUpdated,
}: WisdomQuoteModalProps) {
  const { t, language, deleteWisdomQuote, updateWisdomQuote, addXP } = useApp();
  const { isAdmin, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error'; message: string} | null>(null);
  const [editForm, setEditForm] = useState({
    mongolian: '',
    translationZh: '',
    translationEn: '',
    author: '',
  });

  const resetEditForm = useCallback(() => {
    if (quote) {
      setEditForm({
        mongolian: quote.mongolian || '',
        translationZh: typeof quote.translation === 'object' ? (quote.translation?.zh || '') : '',
        translationEn: typeof quote.translation === 'object' ? (quote.translation?.en || '') : '',
        author: quote.author || '',
      });
    }
  }, [quote]);

  const handleOpenChangeWrapper = (newOpen: boolean) => {
    if (!newOpen) {
      setEditing(false);
      setFeedback(null);
    }
    onOpenChange(newOpen);
  };

  const handleEditClick = () => {
    resetEditForm();
    setEditing(true);
  };

  const handleSave = async () => {
    if (!quote?.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateWisdomQuote(quote.id, {
        mongolian: editForm.mongolian,
        translation: { zh: editForm.translationZh, en: editForm.translationEn },
        author: editForm.author,
      });
      setFeedback({type: 'success', message: language === 'zh' ? '更新成功' : 'Updated successfully'});
      setTimeout(() => setFeedback(null), 2000);
      setEditing(false);
      // 通知父组件：刷新 SVG 缓存键，让浏览器绕过 <img> 强缓存加载新 SVG
      onUpdated?.();
    } catch (error) {
      console.error('Error updating wisdom quote:', error);
      setFeedback({type: 'error', message: language === 'zh' ? '更新失败' : 'Update failed'});
      setTimeout(() => setFeedback(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quote?.id) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await deleteWisdomQuote(quote.id);
      setFeedback({type: 'success', message: language === 'zh' ? '删除成功' : 'Deleted successfully'});
      setTimeout(() => setFeedback(null), 2000);
      onUpdated?.();
      onOpenChange(false);
      onDelete?.(quote.id);
    } catch (error) {
      console.error('Error deleting wisdom quote:', error);
      setFeedback({type: 'error', message: language === 'zh' ? '删除失败' : 'Delete failed'});
      setTimeout(() => setFeedback(null), 2000);
    } finally {
      setDeleting(false);
    }
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-emerald-700">
              <span className="text-lg">💎</span>
              <span>{language === 'zh' ? '智慧语录' : 'Wisdom Quote'}</span>
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {language === 'zh' ? '查看智慧语录详情' : 'View wisdom quote details'}
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="space-y-4">
            <div>
              <Label className="text-emerald-700 font-medium">
                {language === 'zh' ? '蒙古文' : 'Mongolian'}
              </Label>
              <Textarea
                value={editForm.mongolian}
                onChange={(e) => setEditForm({ ...editForm, mongolian: e.target.value })}
                className="mt-1 min-h-[80px] font-mongolian"
                dir="auto"
              />
            </div>
            <div>
              <Label className="text-emerald-700 font-medium">
                {language === 'zh' ? '中文翻译' : 'Chinese Translation'}
              </Label>
              <Input
                value={editForm.translationZh}
                onChange={(e) => setEditForm({ ...editForm, translationZh: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-emerald-700 font-medium">
                {language === 'zh' ? '英文翻译' : 'English Translation'}
              </Label>
              <Input
                value={editForm.translationEn}
                onChange={(e) => setEditForm({ ...editForm, translationEn: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-emerald-700 font-medium">
                {language === 'zh' ? '作者' : 'Author'}
              </Label>
              <Input
                value={editForm.author}
                onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="w-4 h-4 mr-1" />
                {language === 'zh' ? '取消' : 'Cancel'}
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleSave}
                disabled={saving || (!isAdmin && user?.id !== quote?.createdByUserId)}
                title={!isAdmin && user?.id !== quote?.createdByUserId ? (language === 'zh' ? '仅作者或管理员可编辑' : 'Owner or admin only') : undefined}
              >
                <Save className="w-4 h-4 mr-1" />
                {saving
                  ? (language === 'zh' ? '保存中...' : 'Saving...')
                  : !isAdmin && user?.id !== quote?.createdByUserId
                    ? (language === 'zh' ? '仅作者或管理员可编辑' : 'Owner or admin only')
                    : (language === 'zh' ? '保存' : 'Save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 蒙古文展示 - 预渲染 SVG path */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 text-center border border-amber-200">
              <MongolianTextImage
                key={`wisdom-modal-${quote.id}-${quote.mongolian}`}
                src={quote.id ? getMongolianWisdomImageSrc(quote.id) : undefined}
              wordId={quote.id}
              type="wisdom"
                alt={quote.mongolian}
                fallbackText={quote.mongolian}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="text-slate-900 mx-auto w-14 h-auto"
                imgClassName="w-full h-auto"
              />
            </div>

            {/* 翻译 */}
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {language === 'zh' ? '中文' : 'Chinese'}
                </p>
                <p className="text-gray-700 text-lg">
                  {typeof quote.translation === 'object' ? quote.translation?.zh : quote.translation || ''}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  {language === 'zh' ? '英文' : 'English'}
                </p>
                <p className="text-gray-700 text-lg">
                  {typeof quote.translation === 'object' ? quote.translation?.en : quote.translation || ''}
                </p>
              </div>
            </div>

            {/* 作者 */}
            {quote.author && (
              <div className="text-right text-sm text-gray-500 italic">
                — {quote.author}
              </div>
            )}
          </div>
        )}

        {/* 反馈信息 */}
        {feedback && (
          <div className={`text-sm text-center py-2 px-4 rounded-lg ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* 工具栏 - admin或作者可见编辑和删除按钮 */}
        {(isAdmin || user?.id === quote?.createdByUserId) && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEditClick}
            disabled={editing || saving}
            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            <Pencil className="w-4 h-4 mr-1" />
            {language === 'zh' ? '编辑' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {deleting
              ? (language === 'zh' ? '删除中...' : 'Deleting...')
              : (language === 'zh' ? '删除' : 'Delete')}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
