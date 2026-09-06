'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth, getAuthToken } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, LogIn, Shield, Users, Settings, Trophy, Save, Plus, Trash2, MessageSquare, Send, Check, X, MessageCircle, RefreshCw, Search, Megaphone, Bell, Info, AlertTriangle, CheckCircle, Sparkles, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { XPRule, Level as DBLevel, Announcement, AnnouncementType } from '@/types/auth';
import type { Feedback } from '@/types';

interface UserRow {
  id: string;
  email?: string;
  display_name: string;
  role: 'user' | 'admin';
  created_at: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading, profile } = useAuth();
  const { t, language, refreshXPRules } = useApp();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');

  // XP Rules & Levels state
  const [xpRules, setXPRules] = useState<XPRule[]>([]);
  const [dbLevels, setDbLevels] = useState<DBLevel[]>([]);
  const [xpRulesSaving, setXpRulesSaving] = useState(false);
  const [levelsSaving, setLevelsSaving] = useState(false);

  // Load XP rules and levels
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const [xpRes, lvRes] = await Promise.all([
          fetch('/api/admin/xp-rules'),
          fetch('/api/admin/levels'),
        ]);
        const xpData = await xpRes.json();
        const lvData = await lvRes.json();
        if (xpData.success) setXPRules(xpData.data || []);
        if (lvData.success) setDbLevels(lvData.data || []);
      } catch (e) {
        console.error('Failed to load XP rules/levels:', e);
      }
    })();
  }, [isAdmin]);

  // Route protection: not admin → redirect to /login
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/login?redirect=/admin&reason=admin_only');
    }
  }, [authLoading, isAdmin, router]);

  // Load users on demand
  const loadUsers = async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const res = await fetch('/api/admin/users', {
        headers: token ? { 'x-session': token } : {},
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // ===== Feedback state =====
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbacksLoading, setFeedbacksLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'open' | 'replied' | 'resolved'>('all');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadFeedbacks = async () => {
    if (!isAdmin) return;
    setFeedbacksLoading(true);
    try {
      const res = await fetch('/api/feedback?includeResolved=true');
      const json = await res.json();
      if (json.feedbacks) {
        setFeedbacks(json.feedbacks);
      } else if (json.data?.feedbacks) {
        setFeedbacks(json.data.feedbacks);
      }
    } catch (e) {
      console.error('Failed to load feedbacks:', e);
    } finally {
      setFeedbacksLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadFeedbacks();
    }
  }, [isAdmin]);

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const res = await fetch(`/api/feedback/${id}/reply`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token || '',
        },
        body: JSON.stringify({ adminReply: replyText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setReplyText('');
        setReplyingTo(null);
        await loadFeedbacks();
        await loadAnnouncements();
        alert(isZh ? '回复成功' : 'Reply sent');
      } else {
        alert(json.error || 'Failed');
      }
    } catch (e) {
      console.error('Reply failed:', e);
      alert(isZh ? '回复失败，请稍后再试' : 'Failed to post reply. Please try again.');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm(isZh ? '确认标记为已解决？' : 'Mark as resolved?')) return;
    setResolvingId(id);
    try {
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const res = await fetch(`/api/feedback/${id}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token || '',
        },
        body: JSON.stringify({ resolved: true }),
      });
      const json = await res.json();
      if (json.success) {
        await loadFeedbacks();
        setFeedbackFilter('resolved');
      } else {
        alert((json.error || 'Failed') + `\n[HTTP ${res.status}]`);
      }
    } catch (e) {
      console.error('Resolve failed:', e);
      alert('Resolve failed: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm(isZh ? '确认删除该反馈？此操作不可恢复。' : 'Delete this feedback? This cannot be undone.')) return;
    try {
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const res = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
        headers: token ? { 'x-session': token } : {},
      });
      const json = await res.json();
      if (json.success) {
        await loadFeedbacks();
      } else {
        alert(json.error || 'Failed');
      }
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  // ============ 公告管理 (Announcements) ============
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    priority: 0,
    expires_at: '',
  });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);

  const loadAnnouncements = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/announcements');
      const json = await res.json();
      if (json.success) {
        setAnnouncements(json.data || []);
      }
    } catch (e) {
      console.error('Load announcements failed:', e);
    }
  };

  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      alert(t('请填写标题和内容', 'Please fill in title and content'));
      return;
    }
    setSubmittingAnnouncement(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session': token || '',
        },
        body: JSON.stringify({
          title: announcementForm.title.trim(),
          content: announcementForm.content.trim(),
          type: announcementForm.type,
          priority: announcementForm.priority,
          expires_at: announcementForm.expires_at || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAnnouncementForm({ title: '', content: '', type: 'info', priority: 0, expires_at: '' });
        await loadAnnouncements();
        alert(t('公告已发布！用户打开网站即可看到。', 'Announcement published! Users will see it when they open the site.'));
      } else {
        alert(json.error || 'Failed');
      }
    } catch (e: any) {
      alert(`Failed: ${e?.message || e}`);
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm(t('确定要删除这条公告吗？', 'Delete this announcement?'))) return;
    setDeletingAnnouncementId(id);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'x-session': token || '' },
      });
      const json = await res.json();
      if (json.success) {
        await loadAnnouncements();
      } else {
        alert(json.error || 'Failed');
      }
    } catch (e) {
      console.error('Delete announcement failed:', e);
    } finally {
      setDeletingAnnouncementId(null);
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter !== 'all' && f.status !== feedbackFilter) return false;
    if (feedbackSearch) {
      const q = feedbackSearch.toLowerCase();
      if (
        !(f.message || '').toLowerCase().includes(q) &&
        !(f.name || '').toLowerCase().includes(q) &&
        !(f.identity || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const feedbackStats = {
    all: feedbacks.length,
    open: feedbacks.filter((f) => f.status === 'open').length,
    replied: feedbacks.filter((f) => f.status === 'replied').length,
    resolved: feedbacks.filter((f) => f.status === 'resolved').length,
  };

  // Show login prompt if not admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Loading…</div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {t('需要管理员权限', 'Admin Access Required')}
            </h2>
            <p className="text-slate-500 text-sm">
              {t('请使用管理员账号登录后访问此页面。', 'Please sign in with an admin account to access this page.')}
            </p>
            <Button onClick={() => router.push('/login?redirect=/admin')} className="w-full bg-amber-500 hover:bg-amber-600">
              <LogIn className="w-4 h-4 mr-2" />
              {t('去登录', 'Sign in')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isZh = language === 'zh';

  const filteredUsers = users.filter(u =>
    !usersSearch || u.display_name?.toLowerCase().includes(usersSearch.toLowerCase())
  );

  const handleToggleUserRole = async (userId: string) => {
    if (!confirm(isZh ? '确定要改变这个用户的角色吗？' : 'Change this user\'s role?')) return;
    if (userId === profile?.id) {
      alert(isZh ? '不能修改自己的角色' : 'Cannot modify your own role');
      return;
    }
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-session': token || '' },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (json.success) {
        await loadUsers();
      } else {
        alert(json.error || 'Failed');
      }
    } catch (e) {
      console.error(e);
      alert('Failed');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (userId === profile?.id) {
      alert(isZh ? '不能删除自己' : 'Cannot delete yourself');
      return;
    }
    const confirmMsg = isZh
      ? `确定要删除用户「${user.display_name || user.email}」吗？\n\n此操作会：\n• 删除该用户的 auth 账号\n• 删除该用户的 profile 档案\n• 该用户将无法再登录\n\n此操作不可恢复！`
      : `Delete user "${user.display_name || user.email}"?\n\nThis will:\n• Delete the user's auth account\n• Delete the user's profile\n• The user can no longer login\n\nThis cannot be undone!`;
    if (!confirm(confirmMsg)) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'x-session': token || '' },
      });
      const json = await res.json();
      if (json.success) {
        alert(isZh ? '用户已删除' : 'User deleted');
        await loadUsers();
      } else {
        alert(json.error || (isZh ? '删除失败' : 'Delete failed'));
      }
    } catch (e) {
      console.error(e);
      alert(isZh ? '删除失败' : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50/30">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{t('管理后台', 'Admin Console')}</h1>
              <p className="text-xs text-slate-500">{profile?.display_name || ''} · {t('管理员', 'Administrator')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm">{t('返回站点', 'Back to site')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="xp-rules" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-4xl">
            <TabsTrigger value="xp-rules" className="flex items-center gap-1 text-xs">
              <Settings className="w-3.5 h-3.5" />
              {t('XP规则', 'XP Rules')}
            </TabsTrigger>
            <TabsTrigger value="levels" className="flex items-center gap-1 text-xs">
              <Trophy className="w-3.5 h-3.5" />
              {t('等级', 'Levels')}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1 text-xs">
              <Users className="w-3.5 h-3.5" />
              {t('用户', 'Users')}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3.5 h-3.5" />
              {t('反馈', 'Feedback')}
              {feedbackStats.open > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {feedbackStats.open}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1 text-xs">
              <Megaphone className="w-3.5 h-3.5" />
              {t('公告', 'Announcements')}
              {announcements.length > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[10px] bg-amber-500 hover:bg-amber-500">
                  {announcements.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            {/* 用户统计卡片 */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                    <p className="text-xs text-slate-500">{t('注册用户', 'Registered Users')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-800">{users.filter(u => u.role === 'admin').length}</p>
                    <p className="text-xs text-amber-600">{t('管理员', 'Admins')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-800">{users.filter(u => u.role === 'user').length}</p>
                    <p className="text-xs text-emerald-600">{t('普通用户', 'Regular Users')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('按 display_name 搜索', 'Search by display name')}
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                className="flex-1 max-w-sm px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <Button onClick={loadUsers} variant="outline" size="sm" disabled={usersLoading}>
                {usersLoading ? t('加载中...', 'Loading...') : t('刷新', 'Refresh')}
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                          {(u.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{u.display_name || u.email?.split('@')[0]}</p>
                          <p className="text-xs text-slate-400">{u.email || new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className={u.role === 'admin' ? 'bg-amber-500' : ''}>
                          {u.role}
                        </Badge>
                        {u.id !== profile?.id && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleUserRole(u.id)}
                            >
                              {u.role === 'admin' ? t('降为用户', 'Demote') : t('升为管理员', 'Promote')}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                              title={t('删除用户', 'Delete User')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && !usersLoading && (
                    <p className="p-8 text-center text-slate-400">{t('未找到用户', 'No users found')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* XP Rules Tab */}
          <TabsContent value="xp-rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {t('修改经验值规则后，前端实时生效。', 'XP rule changes take effect immediately.')}
              </p>
              <Button
                onClick={async () => {
                  setXpRulesSaving(true);
                  try {
                    const token = getAuthToken();
                    const res = await fetch('/api/admin/xp-rules', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'x-session': token || '' },
                      body: JSON.stringify({ rules: xpRules }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      await refreshXPRules();
                      alert(isZh ? '保存成功' : 'Saved');
                    } else {
                      alert(json.error || 'Failed');
                    }
                  } catch (e) {
                    alert('Failed');
                  } finally {
                    setXpRulesSaving(false);
                  }
                }}
                disabled={xpRulesSaving}
                className="bg-amber-500 hover:bg-amber-600"
              >
                <Save className="w-4 h-4 mr-1" />
                {xpRulesSaving ? t('保存中...', 'Saving...') : t('保存', 'Save')}
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {xpRules.map((rule, idx) => (
                    <div key={rule.id} className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{isZh ? rule.description_zh : rule.description_en}</p>
                        <p className="text-xs text-slate-400 font-mono">{rule.id}</p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={rule.value}
                        onChange={(e) => {
                          const next = [...xpRules];
                          next[idx] = { ...next[idx], value: parseInt(e.target.value) || 0 };
                          setXPRules(next);
                        }}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-slate-400">XP</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Levels Tab */}
          <TabsContent value="levels" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                {t('修改等级系统后，前端实时生效。', 'Level system changes take effect immediately.')}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const maxLevel = dbLevels.reduce((m, l) => Math.max(m, l.level), 0);
                    const maxXP = dbLevels.reduce((m, l) => Math.max(m, l.min_xp), 0);
                    setDbLevels([...dbLevels, {
                      level: maxLevel + 1,
                      min_xp: maxXP + 500,
                      name_zh: '新等级',
                      name_en: 'New Level',
                      icon: '⭐',
                      sort_order: maxLevel + 1,
                      updated_at: Date.now(),
                    }]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('新增等级', 'Add Level')}
                </Button>
                <Button
                  onClick={async () => {
                    setLevelsSaving(true);
                    try {
                      const token = getAuthToken();
                      const res = await fetch('/api/admin/levels', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'x-session': token || '' },
                        body: JSON.stringify({ levels: dbLevels }),
                      });
                      const json = await res.json();
                      if (json.success) {
                        await refreshXPRules();
                        alert(isZh ? '保存成功' : 'Saved');
                      } else {
                        alert(json.error || 'Failed');
                      }
                    } catch (e) {
                      alert('Failed');
                    } finally {
                      setLevelsSaving(false);
                    }
                  }}
                  disabled={levelsSaving}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {levelsSaving ? t('保存中...', 'Saving...') : t('保存', 'Save')}
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {dbLevels.sort((a, b) => a.level - b.level).map((lv, idx) => (
                    <div key={lv.level} className="flex items-center gap-3 p-4">
                      <Input
                        value={lv.icon}
                        onChange={(e) => {
                          const next = [...dbLevels];
                          next[idx] = { ...next[idx], icon: e.target.value };
                          setDbLevels(next);
                        }}
                        className="w-12 text-center text-lg p-1"
                      />
                      <div className="flex-1 grid grid-cols-5 gap-2">
                        <Input
                          placeholder="Lv"
                          type="number"
                          min={1}
                          value={lv.level}
                          onChange={(e) => {
                            const next = [...dbLevels];
                            next[idx] = { ...next[idx], level: parseInt(e.target.value) || 1 };
                            setDbLevels(next);
                          }}
                          className="col-span-1"
                        />
                        <Input
                          placeholder="中文名"
                          value={lv.name_zh}
                          onChange={(e) => {
                            const next = [...dbLevels];
                            next[idx] = { ...next[idx], name_zh: e.target.value };
                            setDbLevels(next);
                          }}
                          className="col-span-2"
                        />
                        <Input
                          placeholder="English"
                          value={lv.name_en}
                          onChange={(e) => {
                            const next = [...dbLevels];
                            next[idx] = { ...next[idx], name_en: e.target.value };
                            setDbLevels(next);
                          }}
                          className="col-span-2"
                        />
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={lv.min_xp}
                        onChange={(e) => {
                          const next = [...dbLevels];
                          next[idx] = { ...next[idx], min_xp: parseInt(e.target.value) || 0 };
                          setDbLevels(next);
                        }}
                        className="w-24 text-center"
                      />
                      <span className="text-sm text-slate-400">XP</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-600"
                        onClick={() => setDbLevels(dbLevels.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'open', 'replied', 'resolved'] as const).map((k) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={feedbackFilter === k ? 'default' : 'outline'}
                    onClick={() => setFeedbackFilter(k)}
                    className="text-xs"
                  >
                    {k === 'all' && t('全部', 'All')}
                    {k === 'open' && t('待回复', 'Open')}
                    {k === 'replied' && t('已回复', 'Replied')}
                    {k === 'resolved' && t('已解决', 'Resolved')}
                    <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                      {feedbackStats[k]}
                    </Badge>
                  </Button>
                ))}
              </div>
              <div className="flex-1 flex items-center gap-2 sm:justify-end">
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <Input
                    placeholder={t('搜索反馈内容...', 'Search feedback...')}
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <Button onClick={loadFeedbacks} variant="outline" size="sm" disabled={feedbacksLoading}>
                  <RefreshCw className={`w-3.5 h-3.5 ${feedbacksLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {filteredFeedbacks.map((f) => (
                    <div key={f.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-bold">
                            {(f.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-800">
                              {f.name || t('匿名', 'Anonymous')}
                            </p>
                            <p className="text-xs text-slate-400">
                              {f.identity || '-'} · {new Date(f.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {f.feedback_type}
                          </Badge>
                          {f.status === 'open' && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              {t('待回复', 'Open')}
                            </Badge>
                          )}
                          {f.status === 'replied' && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                              {t('已回复', 'Replied')}
                            </Badge>
                          )}
                          {f.status === 'resolved' && (
                            <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600 border-slate-200">
                              {t('已解决', 'Resolved')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {f.status !== 'resolved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(f.id)}
                              disabled={resolvingId === f.id}
                              className="h-7 px-2 text-xs font-medium text-emerald-700 hover:text-white hover:bg-emerald-600 border-emerald-300 bg-emerald-50/50"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {t('标记已解决', 'Resolve')}
                            </Button>
                          )}
                          {f.status === 'resolved' && (
                            <span className="h-7 px-2 inline-flex items-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {t('已解决', 'Done')}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteFeedback(f.id)}
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap pl-10">{f.message}</p>

                      {f.admin_reply && (
                        <div className="ml-10 pl-3 border-l-2 border-emerald-300 bg-emerald-50/50 rounded-r-md p-3">
                          <div className="flex items-center gap-2 text-xs text-emerald-700 mb-1">
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="font-medium">
                              {t('管理员回复', 'Admin Reply')} · {f.admin_replied_by || 'admin'}
                            </span>
                            {f.admin_reply_at && (
                              <span className="text-slate-400">
                                · {new Date(f.admin_reply_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.admin_reply}</p>
                        </div>
                      )}

                      {replyingTo === f.id ? (
                        <div className="ml-10 space-y-2">
                          <Textarea
                            placeholder={t('输入回复...', 'Type your reply...')}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReply(f.id)}
                              disabled={!replyText.trim() || submittingReply}
                            >
                              <Send className="w-3.5 h-3.5 mr-1" />
                              {submittingReply ? t('发送中...', 'Sending...') : t('发送回复', 'Send Reply')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              {t('取消', 'Cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : f.status !== 'resolved' ? (
                        <div className="ml-10">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(f.id);
                              setReplyText('');
                            }}
                            className="h-7 text-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />
                            {f.admin_reply ? t('再次回复', 'Reply Again') : t('回复', 'Reply')}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {filteredFeedbacks.length === 0 && !feedbacksLoading && (
                    <p className="p-8 text-center text-slate-400">
                      {t('暂无反馈', 'No feedback yet')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 公告管理 (Announcements) */}
          <TabsContent value="announcements" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 发布表单 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-semibold">
                      {t('发布新公告', 'Publish New Announcement')}
                    </h3>
                  </div>
                  <form onSubmit={handleSubmitAnnouncement} className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        {t('标题', 'Title')} *
                      </label>
                      <Input
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                        placeholder={t('如：每日学习计划更新', 'e.g. Daily Study Plan Update')}
                        maxLength={80}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        {t('内容', 'Content')} *
                      </label>
                      <Textarea
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                        placeholder={t('详细描述公告内容...', 'Describe the announcement in detail...')}
                        maxLength={500}
                        rows={5}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          {t('类型', 'Type')}
                        </label>
                        <Select
                          value={announcementForm.type}
                          onValueChange={(v) => setAnnouncementForm({ ...announcementForm, type: v as AnnouncementType })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="info">ℹ️ {t('信息', 'Info')}</SelectItem>
                            <SelectItem value="warning">⚠️ {t('提醒', 'Warning')}</SelectItem>
                            <SelectItem value="success">✅ {t('喜讯', 'Success')}</SelectItem>
                            <SelectItem value="update">🆕 {t('更新', 'Update')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600 mb-1 block">
                          {t('优先级', 'Priority')}
                        </label>
                        <Input
                          type="number"
                          value={announcementForm.priority}
                          onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: parseInt(e.target.value) || 0 })}
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">
                        {t('过期时间（可选）', 'Expires At (optional)')}
                      </label>
                      <Input
                        type="datetime-local"
                        value={announcementForm.expires_at}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, expires_at: e.target.value })}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('留空则永久有效', 'Leave empty for permanent')}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={submittingAnnouncement}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      {submittingAnnouncement
                        ? t('发布中...', 'Publishing...')
                        : t('发布公告', 'Publish Announcement')}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* 公告列表 */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-600" />
                      <h3 className="text-base font-semibold">
                        {t('公告列表', 'Announcement List')}
                      </h3>
                      <Badge variant="outline">{announcements.length}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={loadAnnouncements}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {announcements.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      {t('暂无公告', 'No announcements yet')}
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {announcements.map((a) => {
                        const typeMeta = {
                          info: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Info className="w-3.5 h-3.5" />, label: t('信息', 'Info') },
                          warning: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: t('提醒', 'Warning') },
                          success: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="w-3.5 h-3.5" />, label: t('喜讯', 'Success') },
                          update: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Sparkles className="w-3.5 h-3.5" />, label: t('更新', 'Update') },
                        }[a.type];
                        const isExpired = a.expires_at && new Date(a.expires_at) < new Date();
                        return (
                          <div
                            key={a.id}
                            className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeMeta.color}`}>
                                    {typeMeta.icon}
                                    {typeMeta.label}
                                  </span>
                                  {a.priority >= 10 && (
                                    <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                      {t('紧急', 'Urgent')}
                                    </Badge>
                                  )}
                                  {isExpired && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px] text-slate-500">
                                      {t('已过期', 'Expired')}
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="text-sm font-semibold text-slate-800 break-words">
                                  {a.title}
                                </h4>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAnnouncement(a.id)}
                                disabled={deletingAnnouncementId === a.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">
                              {a.content}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(a.created_at).toLocaleString('zh-CN')}
                              </span>
                              {a.expires_at && (
                                <span>
                                  {t('过期', 'Expires')}: {new Date(a.expires_at).toLocaleDateString('zh-CN')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
