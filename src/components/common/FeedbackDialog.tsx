'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquarePlus,
  CheckCircle2,
  Loader2,
  X,
  Send,
  Lock,
  MessageCircleReply,
  User as UserIcon,
  Clock,
  Inbox,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useApp } from '@/context/AppContext';
import { useAuth, getAuthToken } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Feedback } from '@/types';

// --- 反馈类型配置（管理员回复场景仍保留 type 字段） ---

const FEEDBACK_TYPES: { value: string; labelZh: string; labelEn: string; icon: string; color: string }[] = [
  { value: 'bug', labelZh: '问题反馈', labelEn: 'Bug Report', icon: '🐛', color: 'from-rose-100 to-pink-100 text-rose-700 border-rose-200' },
  { value: 'feature', labelZh: '功能建议', labelEn: 'Feature Request', icon: '✨', color: 'from-amber-100 to-yellow-100 text-amber-700 border-amber-200' },
  { value: 'content', labelZh: '内容纠错', labelEn: 'Content Correction', icon: '📝', color: 'from-sky-100 to-cyan-100 text-sky-700 border-sky-200' },
  { value: 'praise', labelZh: '鼓励感谢', labelEn: 'Praise & Thanks', icon: '💚', color: 'from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200' },
  { value: 'other', labelZh: '其他', labelEn: 'Other', icon: '💬', color: 'from-slate-100 to-gray-100 text-slate-700 border-slate-200' },
];

// --- 状态徽章 ---

function StatusBadge({ status, language }: { status: Feedback['status']; language: 'zh' | 'en' }) {
  const config = {
    open: {
      labelZh: '待回复',
      labelEn: 'Pending',
      className: 'bg-amber-100 text-amber-700 border-amber-300 ring-1 ring-amber-300/50',
      dot: 'bg-amber-500',
      pulse: true,
    },
    replied: {
      labelZh: '已回复',
      labelEn: 'Replied',
      className: 'bg-sky-100 text-sky-700 border-sky-300 ring-1 ring-sky-300/50',
      dot: 'bg-sky-500',
      pulse: false,
    },
    resolved: {
      labelZh: '已解决',
      labelEn: 'Resolved',
      className: 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-1 ring-emerald-300/50',
      dot: 'bg-emerald-500',
      pulse: false,
    },
  }[status] || {
    labelZh: '未知',
    labelEn: 'Unknown',
    className: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-500',
    pulse: false,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        config.className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping', config.dot)} />
        )}
        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', config.dot)} />
      </span>
      {language === 'zh' ? config.labelZh : config.labelEn}
    </span>
  );
}

function getTypeConfig(value: string) {
  return FEEDBACK_TYPES.find((t) => t.value === value) || FEEDBACK_TYPES[FEEDBACK_TYPES.length - 1];
}

// --- 时间格式化 ---

function formatTimeAgo(iso: string, language: 'zh' | 'en'): string {
  const now = Date.now();
  const past = new Date(iso).getTime();
  const diff = Math.max(0, now - past);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return language === 'zh' ? '刚刚' : 'just now';
  if (minutes < 60) return language === 'zh' ? `${minutes} 分钟前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return language === 'zh' ? `${hours} 小时前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return language === 'zh' ? `${days} 天前` : `${days}d ago`;
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDateTime(iso: string | null | undefined, language: 'zh' | 'en'): string {
  if (!iso) return '';
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return language === 'zh' ? `${y}-${m}-${d} ${hh}:${mm}` : `${m}/${d}/${y} ${hh}:${mm}`;
}

// --- 主组件 ---

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useApp();
  const { isAdmin, user, profile } = useAuth();

  // Tab: 'submit' | 'list'
  const [activeTab, setActiveTab] = useState<'submit' | 'list'>('submit');

  // 反馈列表
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // 提交表单
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [feedbackType, setFeedbackType] = useState('feature');
  const [message, setMessage] = useState('');
  const [willingToContribute, setWillingToContribute] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 旧 ResolveDialog 兼容（密码流）：保留但默认不再使用
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);

  // 新回复流
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [replyError, setReplyError] = useState('');

  // 展开的回复预览
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // --- 拉取列表 ---

  const loadFeedbacks = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const res = await fetch('/api/feedback', {
        headers: { 'x-session': getAuthToken() || '' },
      });
      const data = await res.json();
      if (!res.ok) {
        setListError(data.error || (language === 'zh' ? '加载失败' : 'Failed to load'));
        return;
      }
      setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
    } catch (e) {
      console.error('Load feedbacks error', e);
      setListError(language === 'zh' ? '网络错误' : 'Network error');
    } finally {
      setListLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (open) {
      loadFeedbacks();
    }
  }, [open, loadFeedbacks]);

  // 自动预填姓名/身份（已登录用户）
  useEffect(() => {
    if (open) {
      if (!name && (profile?.display_name || user?.email)) {
        setName(profile?.display_name || user?.email || '');
      }
    }
  }, [open, profile?.display_name, user?.email, name]);

  // --- 提交反馈 ---

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      alert(t('请填写反馈内容', 'Please enter your feedback'));
      return;
    }
    if (message.trim().length < 5) {
      alert(t('反馈内容至少 5 个字', 'Feedback must be at least 5 characters'));
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          identity: identity.trim() || null,
          feedback_type: feedbackType,
          message: message.trim(),
          willing_to_contribute: willingToContribute,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || (language === 'zh' ? '提交失败' : 'Submit failed'));
        return;
      }

      setSubmitSuccess(false);
      setMessage('');
      setWillingToContribute(false);
      // 不重置 name/identity/type，方便连续提交
      // 提交成功后自动跳转到反馈广场，刷新列表
      setActiveTab('list');
      loadFeedbacks();
    } catch (e) {
      console.error('Submit feedback error', e);
      alert(t('网络错误，请稍后再试', 'Network error. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }, [name, identity, feedbackType, message, willingToContribute, language, t]);

  // --- 切换为已解决（保留旧密码流兼容） ---

  const handleMarkResolvedOld = useCallback(
    async (feedbackId: string, code: string) => {
      const res = await fetch(`/api/feedback/${feedbackId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      return res.json();
    },
    []
  );

  // --- 管理员写回复 ---

  const handleReply = useCallback(
    async (feedbackId: string, markResolved: boolean) => {
      if (!replyText.trim()) {
        setReplyError(t('请输入回复内容', 'Please enter your reply'));
        return;
      }
      if (replyText.trim().length < 2) {
        setReplyError(t('回复至少 2 个字', 'Reply must be at least 2 characters'));
        return;
      }

      setReplyLoading(true);
      setReplyError('');

      try {
        const res = await fetch(`/api/feedback/${feedbackId}/reply`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-session': getAuthToken() || '' },
          body: JSON.stringify({
            adminReply: replyText.trim(),
            markResolved,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setReplyError(data.error || (language === 'zh' ? '回复失败' : 'Reply failed'));
          return;
        }

        // 成功：刷新列表
        await loadFeedbacks();
        setReplyingTo(null);
        setReplyText('');
      } catch (e) {
        console.error('Reply feedback error', e);
        setReplyError(t('网络错误，请稍后再试', 'Network error. Please try again.'));
      } finally {
        setReplyLoading(false);
      }
    },
    [replyText, language, t, loadFeedbacks]
  );

  // --- 管理员直接标记为已解决（无需回复） ---

  const handleQuickResolve = useCallback(
    async (feedbackId: string) => {
      try {
        const res = await fetch(`/api/feedback/${feedbackId}/resolve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-session': getAuthToken() || '' },
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data.error || (language === 'zh' ? '操作失败' : 'Failed'));
          return;
        }
        await loadFeedbacks();
      } catch (e) {
        console.error('Quick resolve error', e);
        alert(t('网络错误，请稍后再试', 'Network error. Please try again.'));
      }
    },
    [language, t, loadFeedbacks]
  );

  // --- 展开/收起回复块 ---

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-0">
        {/* 顶部哈达风格 banner */}
        <div className="relative px-6 pt-5 pb-4 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-b border-amber-200/60">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400" />
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </span>
              {t('意见与反馈', 'Feedback')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              {t(
                '告诉我们你的想法、问题或建议，我们会认真阅读每一条反馈',
                'Tell us your thoughts, issues or suggestions. We read every piece of feedback carefully.'
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'submit' | 'list')} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 pb-2 border-b border-slate-100">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 p-1">
              <TabsTrigger value="submit" className="text-xs data-[state=active]:bg-white">
                <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
                {t('提反馈', 'Submit')}
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs data-[state=active]:bg-white">
                <Inbox className="w-3.5 h-3.5 mr-1.5" />
                {t('反馈广场', 'Feedback Board')}
                {feedbacks.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {feedbacks.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 提交反馈 */}
          <TabsContent value="submit" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            {submitSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {t('反馈已提交！', 'Feedback Submitted!')}
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  {t(
                    '感谢你的反馈，管理员会在 24 小时内回复。',
                    'Thanks! Our admin will reply within 24 hours.'
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setSubmitSuccess(false)}
                >
                  {t('再写一条', 'Write Another')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-600 font-medium mb-1.5 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {t('姓名（可选）', 'Name (Optional)')}
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('你的称呼', 'Your name')}
                      className="text-sm"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-600 font-medium mb-1.5 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {t('身份（可选）', 'Identity (Optional)')}
                    </label>
                    <Input
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      placeholder={t('学生 / 老师 / 其他', 'Student / Teacher / Other')}
                      className="text-sm"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium mb-1.5 block">
                    {t('反馈类型', 'Feedback Type')}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {FEEDBACK_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        type="button"
                        onClick={() => setFeedbackType(ft.value)}
                        className={cn(
                          'px-2 py-2 rounded-lg border-2 text-[11px] font-medium transition-all',
                          feedbackType === ft.value
                            ? 'border-amber-500 bg-gradient-to-br ' + ft.color + ' shadow-sm scale-105'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <div className="text-lg mb-0.5">{ft.icon}</div>
                        {language === 'zh' ? ft.labelZh : ft.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 font-medium mb-1.5 block">
                    {t('反馈内容', 'Your Feedback')} <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('请详细描述你的想法、问题或建议...', 'Please describe your thoughts, issues or suggestions...')}
                    rows={6}
                    className="text-sm resize-none"
                    maxLength={2000}
                  />
                  <div className="text-[10px] text-slate-400 text-right mt-0.5">
                    {message.length} / 2000
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={willingToContribute}
                    onChange={(e) => setWillingToContribute(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  {t('我愿意为平台贡献内容（词条/智慧/音频）', 'I am willing to contribute content (words / wisdom / audio)')}
                </label>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />{t('提交中...', 'Submitting...')}</>
                  ) : (
                    <><Send className="w-4 h-4 mr-1.5" />{t('提交反馈', 'Submit Feedback')}</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* 反馈列表 */}
          <TabsContent value="list" className="flex-1 overflow-y-auto px-6 py-4 m-0">
            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                <p className="text-xs text-slate-500">{t('加载中...', 'Loading...')}</p>
              </div>
            ) : listError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-8 h-8 text-rose-400 mb-2" />
                <p className="text-xs text-slate-600">{listError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={loadFeedbacks}>
                  {t('重试', 'Retry')}
                </Button>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Inbox className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {t('还没有反馈', 'No feedback yet')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {t('成为第一个分享想法的人吧', 'Be the first to share your thoughts')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => {
                  const typeConf = getTypeConfig(fb.feedback_type);
                  const isReplyOpen = replyingTo === fb.id;
                  const isExpanded = expanded.has(fb.id);
                  const hasReply = !!(fb.admin_reply && fb.admin_reply.trim());

                  return (
                    <div
                      key={fb.id}
                      className={cn(
                        'group relative rounded-xl border bg-white overflow-hidden transition-all hover:shadow-md',
                        fb.status === 'open' && 'border-amber-200/80 shadow-sm',
                        fb.status === 'replied' && 'border-sky-200/80',
                        fb.status === 'resolved' && 'border-emerald-200/80 bg-emerald-50/30'
                      )}
                    >
                      {/* 状态色条 */}
                      <div
                        className={cn(
                          'absolute left-0 top-0 bottom-0 w-1',
                          fb.status === 'open' && 'bg-amber-400',
                          fb.status === 'replied' && 'bg-sky-400',
                          fb.status === 'resolved' && 'bg-emerald-400'
                        )}
                      />

                      <div className="p-4 pl-5">
                        {/* 头部：类型 + 状态 + 时间 */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-gradient-to-r',
                                typeConf.color
                              )}
                            >
                              <span>{typeConf.icon}</span>
                              {language === 'zh' ? typeConf.labelZh : typeConf.labelEn}
                            </span>
                            <StatusBadge status={fb.status} language={language} />
                          </div>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(fb.created_at, language)}
                          </span>
                        </div>

                        {/* 用户消息 */}
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                          {fb.message}
                        </p>

                        {/* 管理员回复块 */}
                        {hasReply && (
                          <div className="mt-3 rounded-lg bg-gradient-to-br from-sky-50/80 to-cyan-50/60 border-l-2 border-sky-400 p-3">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-700">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500">
                                  <MessageCircleReply className="w-3 h-3 text-white" />
                                </span>
                                {t('管理员回复', 'Admin Reply')}
                                {fb.admin_replied_by && (
                                  <span className="text-slate-500 font-normal">· {fb.admin_replied_by}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {formatDateTime(fb.admin_reply_at, language)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                              {fb.admin_reply}
                            </p>
                          </div>
                        )}

                        {/* 折叠：更多元数据 */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(fb.id)}
                          className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? t('收起', 'Less') : t('详情', 'Details')}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 space-y-1">
                            {fb.name && (
                              <div>👤 {t('姓名', 'Name')}: <span className="text-slate-700">{fb.name}</span></div>
                            )}
                            {fb.identity && (
                              <div>🎓 {t('身份', 'Identity')}: <span className="text-slate-700">{fb.identity}</span></div>
                            )}
                            {fb.willing_to_contribute && (
                              <div className="text-emerald-600">💚 {t('愿意贡献内容', 'Willing to contribute')}</div>
                            )}
                            {fb.resolved_at && (
                              <div>✅ {t('解决时间', 'Resolved at')}: <span className="text-slate-700">{formatDateTime(fb.resolved_at, language)}</span></div>
                            )}
                            <div className="text-slate-400">ID: {fb.id.slice(0, 8)}...</div>
                          </div>
                        )}

                        {/* 管理员操作区 */}
                        {isAdmin && fb.status !== 'resolved' && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            {!isReplyOpen ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setReplyingTo(fb.id);
                                    setReplyText('');
                                    setReplyError('');
                                  }}
                                  className="text-xs border-sky-300 text-sky-700 hover:bg-sky-50"
                                >
                                  <MessageCircleReply className="w-3 h-3 mr-1" />
                                  {t('回复', 'Reply')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleQuickResolve(fb.id)}
                                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  {t('标记已解决', 'Mark Resolved')}
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder={t('输入你的回复...', 'Type your reply...')}
                                  rows={3}
                                  className="text-sm resize-none"
                                  maxLength={2000}
                                  autoFocus
                                />
                                {replyError && (
                                  <p className="text-xs text-rose-500 flex items-center gap-1">
                                    <X className="w-3 h-3" />
                                    {replyError}
                                  </p>
                                )}
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setReplyingTo(null);
                                      setReplyText('');
                                      setReplyError('');
                                    }}
                                    disabled={replyLoading}
                                  >
                                    {t('取消', 'Cancel')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReply(fb.id, false)}
                                    disabled={replyLoading || !replyText.trim()}
                                    className="border-sky-300 text-sky-700 hover:bg-sky-50"
                                  >
                                    {replyLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                    {t('提交回复', 'Send Reply')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleReply(fb.id, true)}
                                    disabled={replyLoading || !replyText.trim()}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                                  >
                                    {replyLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {t('回复并解决', 'Reply & Resolve')}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 已解决：显示简短标识 */}
                        {fb.status === 'resolved' && (
                          <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-1.5 text-[11px] text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t('已解决 · 感谢你的反馈', 'Resolved · Thanks for your feedback')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// --- 触发器按钮组件 ---

export function FeedbackDialogTrigger({ children }: { children?: React.ReactNode }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="text-xs">
            <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" />
            {t('反馈', 'Feedback')}
          </Button>
        )}
      </DialogTrigger>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </Dialog>
  );
}
