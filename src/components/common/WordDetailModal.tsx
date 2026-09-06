'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Word, WordEditForm, canDeleteWord, AudioItem, AudioLabel, hasPlayableAudio } from '@/types';
import { themes } from '@/data/corpus';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MongolianTextImage } from './MongolianTextImage';
import { 
  Edit2, 
  Trash2, 
  Volume2, 
  Upload, 
  X, 
  Check, 
  AlertTriangle,
  Mic,
  VolumeX,
  Sparkles,
  Square,
  Save,
  Plus,
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface WordDetailModalProps {
  word: Word | null;
  open: boolean;
  onClose: () => void;
  /**
   * 词条编辑/删除成功后回调（用于触发父组件刷新 SVG 缓存键等副作用）
   * 可选：未传时不触发额外行为
   */
  onUpdated?: () => void;
}

export function WordDetailModal({ word, open, onClose, onUpdated }: WordDetailModalProps) {
  const { t, language, updateWord, deleteWord, uploadAudioToServer, deleteAudioFromServer, addXP, getWordAudios, loadWordAudios, voteAudio, setAudioLabel } = useApp();
  const { isAdmin, user, isLoggedIn } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState<WordEditForm | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingFileRef = useRef<File | null>(null);
  // 路由刷新：蒙古文修改/删除后无需手动刷新，自动重新拉取服务端数据
  const router = useRouter();
  
  // 音频播放状态
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 录音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [audioName, setAudioName] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // 当前录音使用的 MIME type（动态检测）
  const recordingMimeTypeRef = useRef<string>('audio/webm');
  
  // 检测浏览器支持的录音 MIME type
  // 优先选择移动端兼容性更好的格式
  const getSupportedMimeType = (): string => {
    // 按兼容性顺序尝试不同的 MIME type
    const mimeTypes = [
      // Safari iOS 支持的格式（最优先，因为 iOS Safari 不支持 webm）
      'audio/mp4',
      'audio/m4a',
      'audio/aac',
      // Chrome Android 和桌面支持的格式
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vorbis',
      'audio/webm',
      // 通用 fallback
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log('Supported MIME type found:', mimeType);
        return mimeType;
      }
    }
    
    // 如果都不支持，使用默认的 webm
    console.warn('No preferred MIME type supported, using audio/webm');
    return 'audio/webm';
  };
  
  // 从 MIME type 获取文件扩展名
  const getExtensionFromMimeType = (mimeType: string): string => {
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) {
      return 'm4a';
    }
    if (mimeType.includes('ogg')) {
      return 'ogg';
    }
    return 'webm';
  };

  // 获取当前词条的所有音频（统一从 AppContext 获取 - 服务端缓存）
  const wordAudios = word ? getWordAudios(word.id) : [];
  
  // 加载词条音频
  useEffect(() => {
    if (word && open) {
      loadWordAudios(word.id);
    }
  }, [word?.id, open, loadWordAudios]);
  
  // 组件卸载时停止录音
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
    };
  }, []);

  // 播放音频
  const playAudio = (audio: AudioItem) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    audioRef.current = new Audio(audio.url);
    audioRef.current.onplay = () => setPlayingAudioId(audio.id);
    audioRef.current.onended = () => setPlayingAudioId(null);
    audioRef.current.onerror = () => setPlayingAudioId(null);
    audioRef.current.play();
  };

  // 停止音频
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingAudioId(null);
  };

  // 删除音频 - 从服务端删除
  const handleDeleteAudio = async (audioId: string) => {
    if (!word) return;
    await deleteAudioFromServer(audioId);
  };

  // 投票（点赞/点踩）
  const handleVoteAudio = async (audio: AudioItem, vote: 'up' | 'down') => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    await voteAudio(audio.id, vote);
  };

  // admin 切换 official / community 标签
  const handleToggleAudioLabel = async (audio: AudioItem) => {
    if (!isAdmin) return;
    const next: AudioLabel = audio.label === 'official' ? 'community' : 'official';
    await setAudioLabel(audio.id, next);
  };

  // 初始化编辑表单
  const initEditForm = () => {
    if (!word) return;
    setEditForm({
      mongolian: word.mongolian,
      pinyin: word.pinyin || '',
      translation: { ...word.translation },
      theme: word.theme,
      example: word.example ? { ...word.example } : undefined,
      audios: word.audios || [],
    });
  };

  // 打开编辑模式
  const startEditing = () => {
    initEditForm();
    setIsEditing(true);
    setShowDeleteConfirm(false);
  };

  // 取消编辑
  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!word || !editForm) return;

    // 检测蒙古文是否变化，若变化则需要重新生成 SVG
    const mongolianChanged = (editForm.mongolian || '') !== (word.mongolian || '');

    // 1) 立刻更新本地 state（不依赖 server 返回，保证 UI 立即响应）
    //    AppContext.updateWord 内部已经做乐观更新 + 服务端权威回填
    const success = await updateWord(word.id, {
      mongolian: editForm.mongolian,
      pinyin: editForm.pinyin || undefined,
      translation: editForm.translation,
      theme: editForm.theme,
      example: editForm.example,
    });

    if (!success) {
      console.error('[WordDetailModal] saveEdit 失败，词条未更新');
      // 提示用户失败
      if (typeof window !== 'undefined') {
        window.alert('保存失败，请重试');
      }
      return;
    }

    // 2) 退出编辑模式
    setIsEditing(false);
    setEditForm(null);

    // 3) 通知父组件（用于刷新 SVG 缓存键、列表等）
    //    - updateWord 内部已经触发 setWords + 服务端回填；
    //    - onUpdated 让 CorpusPage 递增 svgRefreshKey，
    //      蒙古文 SVG <img> 的 ?v= 参数变化，浏览器绕过 <img> 强缓存，
    //      自动拉取磁盘上由 syncMongolianDisplayForRecord 重写后的新 SVG。
    if (mongolianChanged) {
      onUpdated?.();
      onClose();
      router.refresh();
    } else {
      // 即使蒙古文没变，pinyin / translation 也改了，列表可能也变了
      onUpdated?.();
    }
  };

  // 删除词条
  const handleDelete = async () => {
    if (!word) return;
    const success = await deleteWord(word.id);
    if (success) {
      onUpdated?.();
      onClose();
      // 词条删除后服务端会清理 SVG 缓存，软刷新让列表 + 词条详情立即更新
      router.refresh();
    }
    setShowDeleteConfirm(false);
  };

  // 处理文件上传 - 上传到服务端存储
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !word) return;
    
    // 验证文件类型（用 startsWith 兼容带参数的 MIME type 如 audio/webm;codecs=opus）
    const validPrefixes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
    if (file.type && !validPrefixes.some(prefix => file.type.startsWith(prefix))) {
      alert(t('请上传有效的音频文件', 'Please upload a valid audio file'));
      return;
    }
    
    setIsUploading(true);
    
    try {
      const audioName = file.name.replace(/\.[^/.]+$/, ''); // 去掉扩展名作为默认名称
      const result = await uploadAudioToServer(word.id, file, audioName);
      
      if (result?.audioItem) {
        addXP('upload_audio');
      } else {
        const errMsg = result?.error || '';
        alert(t(`音频上传失败${errMsg ? '：' + errMsg : ''}`, `Audio upload failed${errMsg ? ': ' + errMsg : ''}`));
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errMsg = err instanceof Error ? err.message : '';
      alert(t(`音频上传失败${errMsg ? '：' + errMsg : ''}`, `Audio upload failed${errMsg ? ': ' + errMsg : ''}`));
    } finally {
      setIsUploading(false);
    }
    
    // 清空 input 以允许重新上传同名文件
    event.target.value = '';
  };

  // 触发文件选择
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 开始录音
  const startRecording = async () => {
    try {
      // 动态检测支持的 MIME type
      const supportedMimeType = getSupportedMimeType();
      recordingMimeTypeRef.current = supportedMimeType;
      
      console.log('Starting recording with MIME type:', supportedMimeType);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedMimeType;
      
      // 尝试使用检测到的 MIME type 创建 MediaRecorder
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType });
      } catch {
        // 如果指定的 MIME type 不支持，回退到默认
        console.warn('Specified MIME type not supported, using default');
        mediaRecorder = new MediaRecorder(stream);
        recordingMimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';
      }
      
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // 使用录音时实际使用的 MIME type 创建 Blob
        const actualMimeType = recordingMimeTypeRef.current;
        const blob = new Blob(recordedChunksRef.current, { type: actualMimeType });
        
        if (blob.size === 0) {
          console.error('Recording blob is empty');
          alert(t('录音为空，请重试', 'Recording is empty, please try again'));
          setRecordedBlob(null);
          setRecordedAudioUrl(null);
        } else {
          // 保存 Blob 并生成预览 URL
          setRecordedBlob(blob);
          const objectUrl = URL.createObjectURL(blob);
          setRecordedAudioUrl(objectUrl);
          console.log('Recording blob created:', {
            mimeType: actualMimeType,
            size: blob.size
          });
        }
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(t('无法访问麦克风，请检查权限设置', 'Cannot access microphone, please check permission settings'));
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 预览录音
  const previewRecording = () => {
    if (!recordedAudioUrl) return;
    
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    
    previewAudioRef.current = new Audio(recordedAudioUrl);
    previewAudioRef.current.onplay = () => setIsPreviewPlaying(true);
    previewAudioRef.current.onended = () => setIsPreviewPlaying(false);
    previewAudioRef.current.play();
  };

  // 停止预览
  const stopPreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    setIsPreviewPlaying(false);
  };

  // 保存录音 - 上传到服务端存储
  const saveRecording = async () => {
    if (!recordedBlob || !word) {
      alert(t('没有录音可保存', 'No recording to save'));
      return;
    }
    
    setIsUploading(true);
    
    try {
      // 使用录音时检测到的 MIME type 创建 File 对象
      const actualMimeType = recordingMimeTypeRef.current;
      const extension = getExtensionFromMimeType(actualMimeType);
      const fileName = `recording-${Date.now()}.${extension}`;
      const file = new File([recordedBlob], fileName, { type: actualMimeType });
      
      // 验证 Blob 不为空
      if (file.size === 0) {
        throw new Error('Recording file is empty');
      }
      
      console.log('Uploading recording:', {
        name: fileName,
        size: file.size,
        mimeType: actualMimeType,
        extension: extension
      });
      
      const name = audioName.trim() || t('录音', 'Recording');
      const result = await uploadAudioToServer(word.id, file, name);
      
      if (result?.audioItem) {
        console.log('Recording saved successfully:', result.audioItem);
        addXP('upload_audio');
        // 清理状态
        setRecordedBlob(null);
        setRecordedAudioUrl(null);
        setAudioName('');
      } else {
        const errMsg = result?.error || '';
        alert(t(`录音保存失败${errMsg ? '：' + errMsg : ''}`, `Recording save failed${errMsg ? ': ' + errMsg : ''}`));
      }
    } catch (error) {
      console.error('Recording save error:', error);
      const errMsg = error instanceof Error ? error.message : '';
      alert(t(`录音保存失败${errMsg ? '：' + errMsg : ''}`, `Recording save failed${errMsg ? ': ' + errMsg : ''}`));
    } finally {
      setIsUploading(false);
    }
  };

  // 取消录音
  const cancelRecording = () => {
    // 清理 object URL
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setIsPreviewPlaying(false);
    setAudioName('');
  };

  if (!word) return null;

  const wordHasAudio = hasPlayableAudio(word);
  const canDelete = canDeleteWord(word);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-emerald-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            {isEditing ? t('编辑词条', 'Edit Word') : t('词条详情', 'Word Details')}
          </DialogTitle>
        </DialogHeader>

        {/* 隐藏的文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm"
          className="hidden"
        />

        {isEditing && editForm ? (
          // 编辑模式
          <div className="space-y-4 py-4">
            {/* 蒙古文 */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('蒙古文', 'Mongolian')} *
              </label>
              <Input
                value={editForm.mongolian}
                onChange={(e) => setEditForm({ ...editForm, mongolian: e.target.value })}
                className="border-emerald-200 focus:border-emerald-500 text-lg"
                placeholder={t('输入蒙古文', 'Enter Mongolian text')}
              />
            </div>

            {/* 拼音 */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('拼音', 'Pinyin')}
              </label>
              <Input
                value={editForm.pinyin}
                onChange={(e) => setEditForm({ ...editForm, pinyin: e.target.value })}
                className="border-emerald-200 focus:border-emerald-500"
                placeholder={t('输入拼音（可选）', 'Enter pinyin (optional)')}
              />
            </div>

            {/* 翻译 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  {t('中文翻译', 'Chinese')} *
                </label>
                <Input
                  value={editForm.translation.zh}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    translation: { ...editForm.translation, zh: e.target.value } 
                  })}
                  className="border-emerald-200 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  {t('英文翻译', 'English')} *
                </label>
                <Input
                  value={editForm.translation.en}
                  onChange={(e) => setEditForm({ 
                    ...editForm, 
                    translation: { ...editForm.translation, en: e.target.value } 
                  })}
                  className="border-emerald-200 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* 主题 */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('所属主题', 'Theme')}
              </label>
              <select
                value={editForm.theme}
                onChange={(e) => setEditForm({ ...editForm, theme: e.target.value as Word['theme'] })}
                className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:border-emerald-500 focus:outline-none"
              >
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.emoji} {language === 'zh' ? theme.nameZh : theme.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* 例句 */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('例句蒙古文', 'Example Sentence (Mongolian)')}
              </label>
              <Textarea
                value={editForm.example?.mongolian || ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  example: { 
                    mongolian: e.target.value, 
                    translation: editForm.example?.translation || { zh: '', en: '' } 
                  } 
                })}
                className="border-emerald-200 focus:border-emerald-500"
                placeholder={t('输入例句（可选）', 'Enter example sentence (optional)')}
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                {t('例句翻译', 'Example Translation')}
              </label>
              <Textarea
                value={editForm.example?.translation?.zh || ''}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  example: { 
                    mongolian: editForm.example?.mongolian || '', 
                    translation: { 
                      zh: e.target.value, 
                      en: editForm.example?.translation?.en || '' 
                    } 
                  } 
                })}
                className="border-emerald-200 focus:border-emerald-500"
                placeholder={t('输入例句翻译（可选）', 'Enter example translation (optional)')}
                rows={2}
              />
            </div>

            {/* 编辑操作按钮 */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={cancelEditing} className="border-emerald-200 text-emerald-600">
                <X className="w-4 h-4 mr-2" />
                {t('取消', 'Cancel')}
              </Button>
              <Button onClick={saveEdit} disabled={!isAdmin && user?.id !== word?.createdByUserId} title={!isAdmin && user?.id !== word?.createdByUserId ? t('仅作者或管理员可编辑', 'Owner or admin only') : undefined} className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-200">
                <Check className="w-4 h-4 mr-2" />
                {!isAdmin && user?.id !== word?.createdByUserId ? t('仅作者或管理员可编辑', 'Owner or admin only') : t('保存', 'Save')}
              </Button>
            </div>
          </div>
        ) : showDeleteConfirm ? (
          // 删除确认
          <div className="py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {t('确认删除', 'Confirm Delete')}
            </h3>
            <p className="text-slate-600 mb-6">
              {t('删除后不可恢复', 'This action cannot be undone')}
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="border-emerald-200 text-emerald-600">
                {t('取消', 'Cancel')}
              </Button>
              <Button onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('删除', 'Delete')}
              </Button>
            </div>
          </div>
        ) : (
          // 查看模式
          <div className="py-4">
            {/* 词条信息 - 使用预渲染 SVG path 文件（稳定、跨浏览器） */}
            <div className="text-center mb-6">
              <MongolianTextImage
                key={`${word.id}-${word.mongolian}`}
                wordId={word.id}
                src={word.mongolianImageSrc}
                alt={word.mongolian}
                fallbackText={word.mongolian}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                srcKey={word.id}
                className="mb-4 inline-block w-16 h-auto mx-auto"
                imgClassName="w-full h-auto"
              />
              {word.pinyin && (
                <p className="text-lg text-emerald-600">[{word.pinyin}]</p>
              )}
            </div>

            {/* 翻译 */}
            <Card className="mb-6 bg-emerald-50 border-emerald-200">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-semibold text-emerald-700">
                  {word.translation[language]}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {language === 'zh' ? word.translation.en : word.translation.zh}
                </p>
              </CardContent>
            </Card>

            {/* 主题标签 */}
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {themes.find((th) => th.id === word.theme)?.emoji}{' '}
                {themes.find((th) => th.id === word.theme) ? (language === 'zh' ? themes.find((th) => th.id === word.theme)!.nameZh : themes.find((th) => th.id === word.theme)!.nameEn) : ''}
              </Badge>
              {word.isUserUploaded && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {t('用户上传', 'User Uploaded')}
                </Badge>
              )}
            </div>

            {/* 音频管理 - 多音频支持 */}
            <Card className="mb-6 bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                {/* 录音预览模式 */}
                {recordedBlob ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Mic className="w-4 h-4" />
                      <span className="text-sm font-medium">{t('录音已保存', 'Recording saved')}</span>
                    </div>
                    
                    {/* 录音名称输入 */}
                    <div>
                      <Input
                        value={audioName}
                        onChange={(e) => setAudioName(e.target.value)}
                        placeholder={t('为录音命名（可选）', 'Name this recording (optional)')}
                        className="border-emerald-200 text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isPreviewPlaying ? stopPreview : previewRecording}
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                      >
                        {isPreviewPlaying ? (
                          <VolumeX className="w-4 h-4 mr-2" />
                        ) : (
                          <Volume2 className="w-4 h-4 mr-2" />
                        )}
                        {isPreviewPlaying ? t('停止', 'Stop') : t('试听录音', 'Preview Recording')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={saveRecording}
                        disabled={false}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {t('保存录音', 'Save Recording')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelRecording}
                        className="border-slate-200 text-slate-600"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('取消', 'Cancel')}
                      </Button>
                    </div>
                  </div>
                ) : isRecording ? (
                  // 录音中模式
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-500">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium">{t('正在录音...', 'Recording...')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={stopRecording}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        {t('停止录音', 'Stop Recording')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // 正常模式 - 显示已有音频列表 + 添加新音频
                  <>
                    {/* 已有音频列表 */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                          {t('音频列表', 'Audio List')}
                          {wordAudios.length > 0 && (
                            <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-200">
                              {wordAudios.length}
                            </Badge>
                          )}
                        </span>
                      </div>
                      
                      {wordAudios.length === 0 ? (
                        <div className="flex items-center gap-2 text-slate-400 py-2">
                          <VolumeX className="w-4 h-4" />
                          <span className="text-sm">{t('暂无音频，点击下方添加', 'No audio yet, click below to add')}</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[...wordAudios]
                            .sort((a, b) => {
                              // 1) official 在前
                              const aOff = a.label === 'official' ? 1 : 0;
                              const bOff = b.label === 'official' ? 1 : 0;
                              if (aOff !== bOff) return bOff - aOff;
                              // 2) 同 label 内：community 按 (up - down) 降序，相同则按 createdAt 降序
                              const aScore = (a.upvotes || 0) - (a.downvotes || 0);
                              const bScore = (b.upvotes || 0) - (b.downvotes || 0);
                              if (aScore !== bScore) return bScore - aScore;
                              return (b.createdAt || 0) - (a.createdAt || 0);
                            })
                            .map((audio) => {
                              const isOfficial = audio.label === 'official';
                              return (
                                <div
                                  key={audio.id}
                                  className={`p-2 rounded-lg border ${
                                    isOfficial
                                      ? 'bg-gradient-to-r from-amber-50 to-white border-amber-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => playingAudioId === audio.id ? stopAudio() : playAudio(audio)}
                                        className={`h-8 w-8 p-0 ${isOfficial ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                      >
                                        {playingAudioId === audio.id ? (
                                          <Pause className="w-4 h-4" />
                                        ) : (
                                          <Play className="w-4 h-4" />
                                        )}
                                      </Button>
                                      <span className="text-sm text-slate-700 truncate flex-1" title={audio.name}>
                                        {audio.name || t('未命名音频', 'Unnamed Audio')}
                                      </span>
                                      {/* 标签徽章 */}
                                      <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                                        isOfficial
                                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {isOfficial ? <Sparkles className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                                        {isOfficial ? t('官方', 'Official') : t('社区', 'Community')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* admin 切换标签 */}
                                      {isAdmin && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleToggleAudioLabel(audio)}
                                          className="h-7 px-2 text-xs text-amber-600 hover:bg-amber-50"
                                          title={isOfficial ? t('改为社区发音', 'Switch to community') : t('改为官方发音', 'Switch to official')}
                                        >
                                          {isOfficial ? t('降为社区', 'Demote') : t('升为官方', 'Promote')}
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteAudio(audio.id)}
                                        disabled={!isAdmin && user?.id !== audio.createdByUserId}
                                        title={(!isAdmin && user?.id !== audio.createdByUserId) ? t('仅可删除自己上传的音频', 'Can only delete your own audio') : undefined}
                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  {/* 评分条：未登录也清晰显示数字（仅禁用点击） */}
                                  <div className="flex items-center gap-1.5 mt-2 pl-10">
                                    <button
                                      type="button"
                                      onClick={() => handleVoteAudio(audio, 'up')}
                                      disabled={!isLoggedIn}
                                      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold rounded-full border transition-all ${
                                        audio.userVote === 'up'
                                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
                                      } disabled:opacity-100 disabled:cursor-pointer`}
                                      title={isLoggedIn ? t('👍 点赞', '👍 Like') : t('登录后投票', 'Login to vote')}
                                    >
                                      <ThumbsUp className={`w-3.5 h-3.5 ${audio.userVote === 'up' ? 'fill-white' : 'fill-emerald-200'}`} />
                                      <span className="tabular-nums">{audio.upvotes ?? 0}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleVoteAudio(audio, 'down')}
                                      disabled={!isLoggedIn}
                                      className={`group inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold rounded-full border transition-all ${
                                        audio.userVote === 'down'
                                          ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-200'
                                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300'
                                      } disabled:opacity-100 disabled:cursor-pointer`}
                                      title={isLoggedIn ? t('👎 点踩', '👎 Dislike') : t('登录后投票', 'Login to vote')}
                                    >
                                      <ThumbsDown className={`w-3.5 h-3.5 ${audio.userVote === 'down' ? 'fill-white' : 'fill-red-200'}`} />
                                      <span className="tabular-nums">{audio.downvotes ?? 0}</span>
                                    </button>
                                    {!isLoggedIn && (
                                      <span className="text-[10px] text-slate-400 ml-1">
                                        {t('登录后可投票', 'Login to vote')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* 添加新音频按钮 */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isLoggedIn ? triggerFileUpload : () => router.push('/login')}
                        disabled={isLoggedIn && isUploading}
                        className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex-1"
                      >
                        {isLoggedIn && isUploading ? (
                          <Mic className="w-4 h-4 mr-2 animate-pulse" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {isLoggedIn ? t('上传音频', 'Upload Audio') : t('登录后上传', 'Login to Upload')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isLoggedIn ? startRecording : () => router.push('/login')}
                        className="border-red-200 text-red-500 hover:bg-red-50 flex-1"
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        {isLoggedIn ? t('录音', 'Record') : t('登录后录音', 'Login to Record')}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {t('支持 MP3、WAV、M4A 格式，可添加多个音频', 'Supports MP3, WAV, M4A, add multiple audio files')}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 例句 */}
            {word.example && (
              <Card className="mb-6 bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    {t('例句', 'Example')}
                  </p>
                  <MongolianTextImage
                    key={`example-${word.id}-${word.example.mongolian}`}
                    wordId={`example-${word.id}`}
                    src={`/mongolian-rendered/words/example-${word.id}.svg`}
                    alt={word.example.mongolian}
                    fallbackText={word.example.mongolian}
                    loading="lazy"
                    decoding="async"
                    srcKey={`example-${word.id}`}
                    className="mb-2 text-slate-800 w-6 h-auto"
                    imgClassName="w-full h-auto"
                  />
                  <p className="text-sm text-slate-600">
                    {word.example.translation[language]}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* 操作按钮 - admin或作者可见编辑/删除 */}
            <div className="flex justify-between pt-4 border-t border-slate-200">
              {(isAdmin || (user?.id && user.id === word?.createdByUserId)) && (
                <Button
                  variant="outline"
                  onClick={startEditing}
                  className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t('编辑词条', 'Edit Word')}
                </Button>
              )}

              {(isAdmin || (user?.id && user.id === word?.createdByUserId)) && canDelete ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('删除', 'Delete')}
                </Button>
              ) : isAdmin ? (
                <span className="text-xs text-slate-400 self-center">
                  {t('系统词条不可删除', 'System words cannot be deleted')}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>

    </Dialog>
  );
}
