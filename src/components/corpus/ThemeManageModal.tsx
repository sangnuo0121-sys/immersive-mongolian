'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { getAuthToken, useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  AlertTriangle,
  Check,
  X,
  RefreshCw
} from 'lucide-react';

interface Theme {
  id: string;
  slug: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  description: string;
  sortOrder: number;
  isSystem: boolean;
  createdAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ThemeManageModal({ open, onClose, onUpdate }: Props) {
  const { t, language } = useApp();
  const { isAdmin } = useAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Theme | null>(null);
  const [migrateTo, setMigrateTo] = useState<string>('');
  
  // 新主题表单
  const [newTheme, setNewTheme] = useState({
    slug: '',
    nameZh: '',
    nameEn: '',
    emoji: '📚',
    description: '',
  });

  // 加载主题列表
  const loadThemes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setThemes(data.data);
      }
    } catch (error) {
      console.error('Failed to load themes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadThemes();
    }
  }, [open]);

  // 添加新主题
  const handleAddTheme = async () => {
    if (!newTheme.slug || !newTheme.nameZh || !newTheme.nameEn) {
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session': token } : {}) },
        body: JSON.stringify(newTheme),
      });
      const data = await res.json();
      if (data.success) {
        setThemes([...themes, data.data]);
        setNewTheme({ slug: '', nameZh: '', nameEn: '', emoji: '📚', description: '' });
        setIsAdding(false);
        onUpdate();
      } else {
        alert(data.error || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add theme:', error);
      alert('添加失败');
    }
  };

  // 更新主题
  const handleUpdateTheme = async (theme: Theme) => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session': token } : {}) },
        body: JSON.stringify({
          id: theme.id,
          slug: theme.slug,
          nameZh: theme.nameZh,
          nameEn: theme.nameEn,
          emoji: theme.emoji,
          description: theme.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setThemes(themes.map(t => t.id === theme.id ? data.data : t));
        setEditingTheme(null);
        onUpdate();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
      alert('更新失败');
    }
  };

  // 删除主题
  const handleDeleteTheme = async (theme: Theme) => {
    try {
      const token = getAuthToken();
      const url = new URL('/api/categories', window.location.origin);
      url.searchParams.set('id', theme.id);
      if (migrateTo) {
        url.searchParams.set('migrateTo', migrateTo);
      }

      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: token ? { 'x-session': token } : {},
      });
      const data = await res.json();
      
      if (data.success) {
        setThemes(themes.filter(t => t.id !== theme.id));
        setShowDeleteConfirm(null);
        setMigrateTo('');
        onUpdate();
      } else if (data.hasWords) {
        // 有词条关联，需要选择迁移目标
        alert(t('该主题下有词条，请选择迁移目标主题后再删除', 'This theme has words. Please select a target theme to migrate to before deleting.'));
      } else {
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete theme:', error);
      alert('删除失败');
    }
  };

  // 拖拽排序（简单实现）
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === targetIndex) return;

    const newThemes = [...themes];
    const [moved] = newThemes.splice(sourceIndex, 1);
    newThemes.splice(targetIndex, 0, moved);
    setThemes(newThemes);

    // 更新排序
    const token = getAuthToken();
    for (let i = 0; i < newThemes.length; i++) {
      await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'x-session': token } : {}) },
        body: JSON.stringify({ id: newThemes[i].id, sort_order: i + 1 }),
      });
    }
    onUpdate();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('主题管理', 'Theme Management')}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadThemes}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 添加新主题按钮 - 仅 admin 可见 */}
          {!isAdding && isAdmin && (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('添加新主题', 'Add New Theme')}
            </Button>
          )}

          {/* 新主题表单 */}
          {isAdding && (
            <div className="p-4 border rounded-lg bg-emerald-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">
                    {t('标识符 (英文)', 'Slug (English)')} *
                  </label>
                  <Input
                    value={newTheme.slug}
                    onChange={(e) => setNewTheme({ ...newTheme, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="my-theme"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">
                    {t('Emoji', 'Emoji')}
                  </label>
                  <Input
                    value={newTheme.emoji}
                    onChange={(e) => setNewTheme({ ...newTheme, emoji: e.target.value })}
                    placeholder="📚"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">
                    {t('中文名称', 'Chinese Name')} *
                  </label>
                  <Input
                    value={newTheme.nameZh}
                    onChange={(e) => setNewTheme({ ...newTheme, nameZh: e.target.value })}
                    placeholder="我的主题"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">
                    {t('英文名称', 'English Name')} *
                  </label>
                  <Input
                    value={newTheme.nameEn}
                    onChange={(e) => setNewTheme({ ...newTheme, nameEn: e.target.value })}
                    placeholder="My Theme"
                    className="text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">
                  {t('描述', 'Description')}
                </label>
                <Input
                  value={newTheme.description}
                  onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
                  placeholder={t('主题描述...', 'Theme description...')}
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTheme({ slug: '', nameZh: '', nameEn: '', emoji: '📚', description: '' });
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  {t('取消', 'Cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddTheme}
                  disabled={!newTheme.slug || !newTheme.nameZh || !newTheme.nameEn || !isAdmin}
                  title={!isAdmin ? t('仅管理员可保存', 'Admin only') : undefined}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200"
                >
                  <Check className="w-4 h-4 mr-1" />
                  {t('保存', 'Save')}
                </Button>
              </div>
            </div>
          )}

          {/* 主题列表 */}
          <div className="space-y-2">
            {themes.map((theme, index) => (
              <div
                key={theme.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragOver={handleDragOver}
                className="p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors group"
              >
                {editingTheme?.id === theme.id ? (
                  // 编辑模式
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editingTheme.slug}
                        onChange={(e) => setEditingTheme({ ...editingTheme, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="text-sm h-8"
                      />
                      <Input
                        value={editingTheme.emoji}
                        onChange={(e) => setEditingTheme({ ...editingTheme, emoji: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={editingTheme.nameZh}
                        onChange={(e) => setEditingTheme({ ...editingTheme, nameZh: e.target.value })}
                        className="text-sm h-8"
                      />
                      <Input
                        value={editingTheme.nameEn}
                        onChange={(e) => setEditingTheme({ ...editingTheme, nameEn: e.target.value })}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTheme(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTheme(editingTheme)}
                        disabled={!isAdmin}
                        title={!isAdmin ? t('仅管理员可保存', 'Admin only') : undefined}
                        className="bg-emerald-500 hover:bg-emerald-600 h-7 disabled:bg-emerald-200"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
                      <span className="text-xl">{theme.emoji}</span>
                      <div>
                        <div className="font-medium text-slate-800">
                          {language === 'zh' ? theme.nameZh : theme.nameEn}
                          {theme.isSystem && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {t('系统', 'System')}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{theme.slug}</div>
                      </div>
                    </div>
                    {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTheme(theme)}
                      >
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      {!theme.isSystem && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteConfirm(theme)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('关闭', 'Close')}
          </Button>
        </DialogFooter>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  {t('确认删除', 'Confirm Delete')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-slate-600">
                  {t(
                    `确定要删除主题「${showDeleteConfirm.nameZh}」吗？`,
                    `Are you sure you want to delete theme "${showDeleteConfirm.nameEn}"?`
                  )}
                </p>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">
                    {t('迁移词条到', 'Migrate words to')}
                  </label>
                  <select
                    value={migrateTo}
                    onChange={(e) => setMigrateTo(e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    <option value="">{t('选择目标主题...', 'Select target theme...')}</option>
                    {themes
                      .filter(t => t.id !== showDeleteConfirm.id)
                      .map(t => (
                        <option key={t.id} value={t.slug}>
                          {t.emoji} {language === 'zh' ? t.nameZh : t.nameEn}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                  {t('取消', 'Cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteTheme(showDeleteConfirm)}
                >
                  {t('删除', 'Delete')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
