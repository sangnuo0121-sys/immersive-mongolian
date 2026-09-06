'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useAuth, getAuthToken } from '@/hooks/useAuth';
import { MongolianTextImage } from '@/components/common/MongolianTextImage';
import { useRouter } from 'next/navigation';
import { getMongolianAcknowledgementImageSrc } from '@/lib/mongolian-image-src';
import type { Acknowledgement } from '@/types';

interface AcknowledgementResponse {
  success: boolean;
  data?: Acknowledgement[];
  error?: string;
}

interface CreateResponse {
  success: boolean;
  data?: Acknowledgement;
  error?: string;
  mongolianCacheStale?: boolean;
  staleWordIds?: string[];
}

export default function AcknowledgementsPage() {
  const { t, language, markMongolianStale } = useApp();
  const { isAdmin } = useAuth();
  const isZh = language === 'zh';
  
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // 提交成功后，提示用户刷新以查看新蒙古文 SVG
  const router = useRouter();
  
  // Form state
  const [mongolianName, setMongolianName] = useState('');
  const [chineseName, setChineseName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [contributionDescription, setContributionDescription] = useState('');
  const [quote, setQuote] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  
  // Load acknowledgements
  const loadAcknowledgements = async () => {
    try {
      const response = await fetch('/api/acknowledgements');
      const result: AcknowledgementResponse = await response.json();
      
      if (result.success && result.data) {
        setAcknowledgements(result.data);
      }
    } catch (error) {
      console.error('Failed to load acknowledgements:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadAcknowledgements();
  }, []);
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mongolianName || !contributionDescription) {
      setSubmitMessage({ type: 'error', text: t('请填写必填字段', 'Please fill required fields') });
      return;
    }
    
    setSubmitting(true);
    setSubmitMessage(null);
    
    try {
      const formData = new FormData();
      formData.append('mongolianName', mongolianName);
      formData.append('chineseName', chineseName);
      formData.append('englishName', englishName);
      formData.append('contributionDescription', contributionDescription);
      formData.append('quote', quote);
      
      if (selectedImage) {
        formData.append('imageBase64', imagePreview || '');
        formData.append('imageType', selectedImage.type);
      }
      
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const response = await fetch('/api/acknowledgements', {
        method: 'POST',
        headers: token ? { 'x-session': token } : {},
        body: formData,
      });
      
      const result: CreateResponse = await response.json();
      
      if (result.success && result.data) {
        setAcknowledgements([result.data, ...acknowledgements]);
        setSubmitMessage({ type: 'success', text: t('保存成功', 'Saved successfully') });
        router.refresh();

        // 标记 stale：生产环境若 SVG 写盘失败，前端转走 API 兜底
        if (result.mongolianCacheStale === true && result.data?.id) {
          markMongolianStale('acknowledgements', result.data.id);
        } else if (Array.isArray(result.staleWordIds) && result.staleWordIds.length > 0) {
          markMongolianStale('acknowledgements', result.staleWordIds);
        }

        // Reset form
        setMongolianName('');
        setChineseName('');
        setEnglishName('');
        setContributionDescription('');
        setQuote('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowForm(false);

        setTimeout(() => setSubmitMessage(null), 3000);
      } else {
        setSubmitMessage({ type: 'error', text: result.error || t('保存失败', 'Save failed') });
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', text: t('保存失败', 'Save failed') });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Delete acknowledgement
  const handleDelete = async (id: string) => {
    if (!confirm(isZh ? '确定要删除这条鸣谢吗？' : 'Are you sure you want to delete this acknowledgement?')) {
      return;
    }
    
    try {
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      const response = await fetch(`/api/acknowledgements?id=${id}`, {
        method: 'DELETE',
        headers: token ? { 'x-session': token } : {},
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAcknowledgements(acknowledgements.filter(a => a.id !== id));
      } else {
        alert(result.error || (isZh ? '删除失败' : 'Delete failed'));
      }
    } catch (error) {
      alert(isZh ? '删除失败' : 'Delete failed');
    }
  };
  
  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 pb-24">
      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-1">
        <nav className="flex items-center gap-1.5 text-xs text-amber-700/80">
          <Link href="/me" className="hover:text-amber-900 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" />
            {t('我的', 'Profile')}
          </Link>
          <span className="text-amber-400">/</span>
          <span className="text-amber-900 font-medium">
            {t('特别鸣谢', 'Acknowledgements')}
          </span>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {t('特别鸣谢', 'Acknowledgements')}
          </h1>
          <p className="text-amber-100">
            {t('感谢每一位贡献者', 'Honoring Every Contributor')}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-700 leading-relaxed">
                {isZh
                  ? '这个页面用于感谢所有为本网站提供帮助、支持、资料、发音、文化内容与启发的人。感谢每一位让蒙古语学习变得更好的贡献者。'
                  : 'This page is dedicated to those who have supported the website through knowledge, recordings, cultural contributions, guidance, and inspiration. Thank you to every contributor who makes Mongolian learning better.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Add Button - 仅 admin 可见 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">
            {t('鸣谢列表', 'Acknowledgements List')}
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({acknowledgements.length})
            </span>
          </h2>
          {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {showForm ? t('取消', 'Cancel') : t('新增鸣谢', 'Add Acknowledgement')}
          </button>
          )}
        </div>

        {/* Submit Message */}
        {submitMessage && (
          <div className={`mb-6 p-4 rounded-xl ${submitMessage.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {submitMessage.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{t('新增鸣谢', 'Add Acknowledgement')}</h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('照片', 'Photo')} ({t('可选', 'Optional')})
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div className="w-24 h-24 border-2 border-dashed border-amber-300 rounded-xl flex items-center justify-center bg-amber-50 hover:bg-amber-100 transition-colors overflow-hidden">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center text-amber-400">
                          <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-slate-500">
                    {t('点击上传照片', 'Click to upload photo')}
                  </p>
                </div>
              </div>

              {/* Mongolian Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('蒙语名', 'Mongolian Name')} *
                </label>
                <input
                  type="text"
                  value={mongolianName}
                  onChange={(e) => setMongolianName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder={isZh ? '请输入蒙语名字' : 'Enter Mongolian name'}
                  required
                />
              </div>

              {/* Chinese Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('中文名', 'Chinese Name')}
                </label>
                <input
                  type="text"
                  value={chineseName}
                  onChange={(e) => setChineseName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder={isZh ? '请输入中文名字' : 'Enter Chinese name'}
                />
              </div>

              {/* English Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('英文名', 'English Name')}
                </label>
                <input
                  type="text"
                  value={englishName}
                  onChange={(e) => setEnglishName(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  placeholder={isZh ? '请输入英文名字' : 'Enter English name'}
                />
              </div>

              {/* Contribution Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('贡献内容', 'Contribution')} *
                </label>
                <textarea
                  value={contributionDescription}
                  onChange={(e) => setContributionDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none"
                  rows={3}
                  placeholder={isZh ? '请描述此人的贡献（如：提供发音资料、整理词库、贡献图片等）' : 'Describe their contribution (e.g., provided recordings, organized corpus, contributed images, etc.)'}
                  required
                />
              </div>

              {/* Quote */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('留言/语录', 'Quote')}
                </label>
                <textarea
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none"
                  rows={2}
                  placeholder={isZh ? '请输入想说的话或语录' : 'Enter a message or quote'}
                />
              </div>

              {/* Submit Button - 仅 admin 可提交 */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !isAdmin}
                  title={!isAdmin ? t('仅管理员可提交', 'Admin only') : undefined}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isAdmin ? (
                    t('仅管理员可提交', 'Admin only')
                  ) : submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('提交中...', 'Submitting...')}
                    </span>
                  ) : (
                    t('提交', 'Submit')
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <svg className="animate-spin w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Empty State */}
        {!loading && acknowledgements.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-12 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              {t('还没有鸣谢内容', 'No acknowledgements yet')}
            </h3>
            <p className="text-slate-500 mb-6">
              {t('成为第一个鸣谢的人吧！', 'Be the first to add an acknowledgement!')}
            </p>
            {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              {t('新增鸣谢', 'Add Acknowledgement')}
            </button>
            )}
          </div>
        )}

        {/* Acknowledgements Grid */}
        {!loading && acknowledgements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {acknowledgements.map((ack) => (
              <div
                key={ack.id}
                className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Image */}
                {ack.imageUrl ? (
                  <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 overflow-hidden">
                    <img
                      src={ack.imageUrl}
                      alt={ack.mongolianName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center">
                      <MongolianTextImage
                        key={`ack-avatar-${ack.id}-${ack.mongolianName}`}
                        src={ack.id ? getMongolianAcknowledgementImageSrc(ack.id) : undefined}
                        wordId={ack.id}
                        type="ack"
                        alt={ack.mongolianName.slice(0, 1)}
                        fallbackText={ack.mongolianName.slice(0, 1)}
                        loading="lazy"
                        decoding="async"
                        className="text-amber-600 w-6 h-auto"
                        imgClassName="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="p-5">
                  {/* Name */}
                  <div className="mb-3">
                    <MongolianTextImage
                      key={`ack-name-${ack.id}-${ack.mongolianName}`}
                      src={ack.id ? getMongolianAcknowledgementImageSrc(ack.id) : undefined}
                      wordId={ack.id}
                      type="ack"
                      alt={ack.mongolianName}
                      fallbackText={ack.mongolianName}
                      loading="lazy"
                      decoding="async"
                      className="text-amber-700 mb-1 w-6 h-auto"
                      imgClassName="w-full h-auto"
                    />
                    {(ack.chineseName || ack.englishName) && (
                      <div className="text-sm text-slate-600">
                        {ack.chineseName && <span>{ack.chineseName}</span>}
                        {ack.chineseName && ack.englishName && <span className="mx-1">·</span>}
                        {ack.englishName && <span>{ack.englishName}</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Contribution */}
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                      {t('贡献', 'Contribution')}
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {ack.contributionDescription}
                    </p>
                  </div>
                  
                  {/* Quote */}
                  {ack.quote && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-lg border-l-2 border-amber-400">
                      <p className="text-sm text-slate-600 italic">
                        &ldquo;{ack.quote}&rdquo;
                      </p>
                    </div>
                  )}
                  
                  {/* Footer */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {formatDate(ack.createdAt)}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(ack.id)}
                        className="text-xs text-red-500 hover:text-red-600 transition-colors"
                      >
                        {t('删除', 'Delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
