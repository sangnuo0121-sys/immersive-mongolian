"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAuthToken } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Search,
  Upload,
  Settings2,
  Plus,
  ArrowUpDown,
  Sparkles,
  Library,
  ScrollText,
  X,
  Eye,
  EyeOff,
  Globe,
  Heart,
  Users,
  BookOpen,
  Layers,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { Word } from "@/types";
import { themes as THEMES } from "@/data/corpus";
import { MongolianTextImage } from "@/components/common/MongolianTextImage";
import {
  getMongolianImageSrc,
  getMongolianWisdomImageSrc,
} from "@/lib/mongolian-image-src";
import {
  YurtSilhouette,
  KhataRibbon,
  ScrollFrame,
  SteppeHorizon,
  CloudPattern,
  SoyomboFlame,
  StationBadge,
  NaadamRing,
  MongolianVerticalWatermark,
  MorinKhuur,
} from "@/components/learning/MongolianDecorations";
import { ThemeManageModal } from "./ThemeManageModal";
import { UploadModal } from "./UploadModal";
import { WisdomQuoteModal } from "./WisdomQuoteModal";
import { WordDetailModal } from "@/components/common/WordDetailModal";

type TabKey = "words" | "wisdom";
type SortKey = "newest" | "oldest" | "az" | "za" | "theme";

export function CorpusPage() {
  const { words, wisdomQuotes, themes, isLoading, refreshData, t, language } =
    useApp();
  const { isAdmin, isLoggedIn } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("words");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("theme");

  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [uploadModal, setUploadModal] = useState<{
    open: boolean;
    type: "word" | "wisdom";
    editingWord?: Word | null;
    editingQuote?: any | null;
  }>({ open: false, type: "word" });
  const [themeManageOpen, setThemeManageOpen] = useState(false);

  // Wisdom detail modal state (parity with previous version)
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);

  const openUploadModal = (type: "word" | "wisdom") => {
    setUploadModal({ open: true, type });
  };

  const handleContribute = (type: "word" | "wisdom") => {
    if (!isLoggedIn) {
      toast.error(t("请先登录后再贡献", "Please log in to contribute"), {
        description: t("正在跳转到登录页…", "Redirecting to login…"),
      });
      router.push("/login");
      return;
    }
    openUploadModal(type);
  };

  const handleSubmitWord = async (data: any) => {
    const token = getAuthToken();
    if (!token) {
      toast.error(language === "zh" ? "请先登录后再上传" : "Please log in to upload");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/corpus", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": token },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setUploadModal((p) => ({ ...p, open: false }));
        toast.success(language === "zh" ? "词条上传成功！+15 XP" : "Word uploaded! +15 XP");
        await refreshData();
        setSvgRefreshKey((k) => k + 1);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(language === "zh" ? `上传失败: ${err.error}` : `Upload failed: ${err.error}`);
      }
    } catch {
      toast.error(language === "zh" ? "网络错误，请重试" : "Network error, please retry");
    }
  };

  const handleSubmitWisdom = async (data: any) => {
    const token = getAuthToken();
    if (!token) {
      toast.error(language === "zh" ? "请先登录后再上传" : "Please log in to upload");
      router.push("/login");
      return;
    }
    try {
      const res = await fetch("/api/wisdom", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": token },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setUploadModal((p) => ({ ...p, open: false }));
        toast.success(language === "zh" ? "智慧语录上传成功！+15 XP" : "Wisdom quote uploaded! +15 XP");
        await refreshData();
        setSvgRefreshKey((k) => k + 1);
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(language === "zh" ? `上传失败: ${err.error}` : `Upload failed: ${err.error}`);
      }
    } catch {
      toast.error(language === "zh" ? "网络错误，请重试" : "Network error, please retry");
    }
  };

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = words;
    if (selectedThemeId !== "all") {
      list = list.filter((w) => w.theme === selectedThemeId);
    }
    if (q) {
      list = list.filter(
        (w) =>
          w.mongolian?.toLowerCase().includes(q) ||
          w.translation?.zh?.toLowerCase().includes(q) ||
          w.translation?.en?.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === "az") sorted.sort((a, b) => a.mongolian.localeCompare(b.mongolian));
    else if (sortBy === "za") sorted.sort((a, b) => b.mongolian.localeCompare(a.mongolian));
    else if (sortBy === "oldest")
      sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    else if (sortBy === "theme") {
      // 按主题排序：主题按 THEMES 数组顺序排序，主题内按最早优先（createdAt 升序）
      const themeOrder = new Map<string, number>();
      THEMES.forEach((th: { id: string }, idx: number) => themeOrder.set(th.id, idx));
      sorted.sort((a, b) => {
        const ai = a.theme ? (themeOrder.get(a.theme) ?? 999) : 999;
        const bi = b.theme ? (themeOrder.get(b.theme) ?? 999) : 999;
        if (ai !== bi) return ai - bi;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
    }
    else sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return sorted;
  }, [words, searchQuery, selectedThemeId, sortBy]);

  const filteredWisdom = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = wisdomQuotes;
    if (q) {
      list = list.filter(
        (w) =>
          w.mongolian?.toLowerCase().includes(q) ||
          w.translation?.zh?.toLowerCase().includes(q) ||
          w.translation?.en?.toLowerCase().includes(q) ||
          w.author?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [wisdomQuotes, searchQuery]);

  const totalWords = words.length;
  const totalWisdom = wisdomQuotes.length;
  const totalThemes = themes.length;
  // 社区贡献 = 排除系统种子词(id 形如 bc_01 / fj_03)后的用户上传词条
  const communityContribWords = useMemo(
    () => words.filter((w) => !/^[a-z]+_\d+$/.test(w.id)).length,
    [words]
  );

  const [svgRefreshKey, setSvgRefreshKey] = useState(0);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* 顶部背景：草原天际线 + 5 色哈达飘带 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/40 via-emerald-50/30 to-rose-50/20" />
        <SteppeHorizon className="absolute inset-x-0 bottom-0 h-64 opacity-50" />
        <KhataRibbon className="absolute top-0 left-0 right-0 h-1.5 z-10" />
        <div className="pointer-events-none absolute top-12 right-8 text-[120px] font-bold text-emerald-900/[0.05] leading-none select-none -rotate-6">
          ᠮᠣᠩᠭᠣᠯ
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* ========== 顶部 Hero · 草原图书馆 ========== */}
        <section className="relative mb-8 sm:mb-12">
          <div className="absolute -left-4 top-4 hidden sm:block">
            <YurtSilhouette className="h-32 w-auto opacity-30" />
          </div>
          <div className="absolute -right-4 bottom-0 hidden sm:block">
            <SoyomboFlame className="h-16 w-16 opacity-40" />
          </div>

          <div className="relative text-center sm:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-emerald-100 px-4 py-1.5 text-xs font-medium text-amber-900 border border-amber-200/50">
              <ScrollText className="h-3.5 w-3.5" />
              {t("草原图书馆", "Steppe Library")}
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-amber-700 via-rose-700 to-emerald-700 bg-clip-text text-transparent">
                {t("词库中心", "Corpus Center")}
              </span>
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto sm:mx-0">
              {t(
                "收录羊皮卷上的智慧，传承草原千年的语汇。每一词都是一颗草原上的种子。",
                "Collecting the wisdom on parchment, carrying forward a thousand years of steppe vocabulary. Every word is a seed on the grassland."
              )}
            </p>
          </div>
        </section>

        {/* ========== 使命号召 · 共建数字蒙古文档案库 ========== */}
        <section className="relative mb-8 sm:mb-12">
          <ScrollFrame className="absolute inset-0 -m-2 opacity-20">{null}</ScrollFrame>
          <div className="pointer-events-none absolute -right-4 bottom-2 hidden md:block opacity-25">
            <MorinKhuur className="h-28 w-auto" />
          </div>
          <div className="pointer-events-none absolute right-4 top-4">
            <MongolianVerticalWatermark
              text="ᠪᠢᠴᠢᠭ"
              className="text-7xl text-amber-900/[0.07] font-bold"
            />
          </div>
          <Card className="relative overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-rose-50/40 to-emerald-50/60 shadow-sm">
            <KhataRibbon className="absolute top-0 left-0 right-0 h-1" />
            <CardContent className="relative p-5 sm:p-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-100 via-amber-100 to-rose-100 px-4 py-1.5 text-xs font-medium text-emerald-900 border border-emerald-200/50">
                <Globe className="h-3.5 w-3.5" />
                {t("共建使命", "Shared Mission")}
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight text-slate-800">
                <span className="bg-gradient-to-r from-emerald-700 via-amber-700 to-rose-700 bg-clip-text text-transparent">
                  {t("共建数字蒙古文档案库", "Building the Digital Mongolian Archive Together")}
                </span>
              </h2>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-600 max-w-3xl">
                {t(
                  "这个词库由社区共同建设，希望以可持续的方式保存和传播传统蒙古文。每一个词条、发音和修改，都是对语言、文化与记忆的共同守护。",
                  "This archive is built by the community to preserve and share traditional Mongolian sustainably. Every word, pronunciation, and correction helps protect our language, culture, and shared memory."
                )}
              </p>

              <div className="mt-6 grid gap-3 sm:gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-rose-200/50 bg-white/70 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-sm">
                    <Heart className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("语言保存", "Language Preservation")}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {t("上传词条，让传统蒙古文焕发新生", "Upload words to revitalize traditional Mongolian")}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200/50 bg-white/70 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("社区共建", "Community Driven")}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {t("为词条添加发音，让每一个词都被听见", "Add pronunciations so every word is heard")}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/50 bg-white/70 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("文化传承", "Cultural Heritage")}</h3>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    {t("分享智慧语录，让千年哲思延续", "Share wisdom quotes to pass on millennial philosophy")}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => handleContribute("word")}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("贡献词条", "Contribute a Word")}
                </Button>
                <Button
                  onClick={() => handleContribute("wisdom")}
                  variant="outline"
                  className="flex-1 border-amber-300 bg-white/80 hover:bg-amber-50 text-amber-900"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("分享智慧", "Share Wisdom")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ========== 4 项统计 + 快捷入口 ========== */}
        <section className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <CorpusStatCard
            icon={<ScrollText className="h-5 w-5" />}
            label={t("总词条", "Total Words")}
            value={totalWords}
            accent="from-amber-500 to-orange-500"
            watermark="ᠦᠭᠡ"
          />
          <CorpusStatCard
            icon={<Sparkles className="h-5 w-5" />}
            label={t("智慧语录", "Wisdom Quotes")}
            value={totalWisdom}
            accent="from-rose-500 to-pink-500"
            watermark="ᠪᠢᠴᠢᠭ"
          />
          <CorpusStatCard
            icon={<Library className="h-5 w-5" />}
            label={t("主题驿站", "Theme Stations")}
            value={totalThemes}
            accent="from-emerald-500 to-teal-500"
            watermark="ᠤᠢᠷᠳᠡᠭᠡ"
          />
          <CorpusStatCard
            icon={<Users className="h-5 w-5" />}
            label={t("社区贡献", "Community Contributions")}
            value={communityContribWords}
            accent="from-rose-500 to-amber-500"
            watermark="ᠨᠠᠶᠢᠵᠠ"
          />
        </section>

        {/* ========== 羊皮卷卷轴 · 搜索 + Tab + 操作 ========== */}
        <section className="relative mb-6">
          <ScrollFrame className="absolute inset-0 -m-2 opacity-30">{null}</ScrollFrame>
          <Card className="relative border-amber-200/60 bg-gradient-to-b from-amber-50/80 via-white to-rose-50/40 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              {/* 顶部 5 色哈达 */}
              <div className="absolute top-0 left-2 right-2 flex h-1">
                <div className="flex-1 bg-sky-400" />
                <div className="flex-1 bg-white border-x border-amber-200" />
                <div className="flex-1 bg-amber-400" />
                <div className="flex-1 bg-emerald-400" />
                <div className="flex-1 bg-rose-500" />
              </div>

              {/* Tabs */}
              <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                <CorpusTab
                  active={activeTab === "words"}
                  onClick={() => setActiveTab("words")}
                  icon={<ScrollText className="h-4 w-4" />}
                  labelZh="羊皮卷词库"
                  labelEn="Word Library"
                  count={totalWords}
                  accent="amber"
                  language={language}
                />
                <CorpusTab
                  active={activeTab === "wisdom"}
                  onClick={() => setActiveTab("wisdom")}
                  icon={<Sparkles className="h-4 w-4" />}
                  labelZh="智慧经卷"
                  labelEn="Wisdom Scrolls"
                  count={totalWisdom}
                  accent="rose"
                  language={language}
                />
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setThemeManageOpen(true)}
                        className="border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100"
                      >
                        <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                        {t("主题管理", "Manage Themes")}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openUploadModal(activeTab === "words" ? "word" : "wisdom")}
                        className="bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md hover:shadow-lg"
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {activeTab === "words"
                          ? t("贡献词条", "Contribute Word")
                          : t("分享智慧", "Share Wisdom")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 搜索 + 排序 + 主题筛选 */}
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="relative sm:col-span-6">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t(
                      "在羊皮卷上搜寻… (蒙古文 / 中文 / 英文)",
                      "Search the parchment… (Mongolian / Chinese / English)"
                    )}
                    className="pl-9 border-amber-200/60 bg-white/80"
                  />
                </div>

                {activeTab === "words" && (
                  <>
                    <select
                      value={selectedThemeId}
                      onChange={(e) => setSelectedThemeId(e.target.value)}
                      className="sm:col-span-3 rounded-md border border-amber-200/60 bg-white/80 px-3 py-2 text-sm"
                    >
                      <option value="all">{t("全部主题", "All Themes")}</option>
                      {themes.map((th) => (
                        <option key={th.id} value={th.id}>
                          {(language === "zh" ? th.name?.zh : th.name?.en) || th.id}
                        </option>
                      ))}
                    </select>
                    <div className="sm:col-span-3 flex items-center gap-2 min-w-0">
                      <ArrowUpDown className="h-4 w-4 text-amber-600 shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortKey)}
                        title={t(
                          "按主题排列，主题内按最早优先",
                          "Sort by theme, oldest first within each theme"
                        )}
                        className="min-w-0 flex-1 truncate rounded-md border border-amber-200/60 bg-white/80 px-3 py-2 text-sm"
                      >
                        <option value="newest">{t("最新优先", "Newest")}</option>
                        <option value="oldest">{t("最早优先", "Oldest")}</option>
                        <option value="az">{t("蒙古文 A → Z", "Mongolian A → Z")}</option>
                        <option value="za">{t("蒙古文 Z → A", "Mongolian Z → A")}</option>
                        <option value="theme">{t("按主题", "By Theme")}</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ========== 内容区 ========== */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            {t("正在展开羊皮卷…", "Unrolling the parchment…")}
          </div>
        ) : activeTab === "words" ? (
          <WordLibrary
            words={filteredWords}
            onWordClick={(w) => setSelectedWord(w)}
            t={t}
            language={language}
            searchQuery={searchQuery}
            selectedThemeId={selectedThemeId}
            themes={themes}
            svgRefreshKey={svgRefreshKey}
          />
        ) : (
          <WisdomLibrary
            quotes={filteredWisdom}
            onQuoteClick={(q) => setSelectedQuote(q)}
            t={t}
            language={language}
            svgRefreshKey={svgRefreshKey}
          />
        )}
      </div>

      {/* ========== Modals ========== */}
      <UploadModal
        open={uploadModal.open}
        onClose={() => setUploadModal({ open: false, type: 'word' })}
        type={uploadModal.type}
        onSubmitWord={handleSubmitWord}
        onSubmitWisdom={handleSubmitWisdom}
      />
      <ThemeManageModal
        open={themeManageOpen}
        onClose={() => setThemeManageOpen(false)}
        onUpdate={refreshData}
      />
      <WordDetailModal
        word={selectedWord}
        open={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        onUpdated={() => {
          // 编辑/删除成功后递增 svgRefreshKey，
          // 蒙古文 SVG <img> 的 ?v= 参数随之变化，浏览器绕过 <img> 强缓存，
          // 自动拉取磁盘上由 syncMongolianDisplayForRecord 重写后的新 SVG
          setSvgRefreshKey((k) => k + 1);
        }}
      />
      <WisdomQuoteModal
        quote={selectedQuote}
        open={!!selectedQuote}
        onOpenChange={(o) => !o && setSelectedQuote(null)}
        onUpdated={() => {
          setSvgRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

/* ===================== 组件：统计卡 ===================== */
function CorpusStatCard({
  icon,
  label,
  value,
  accent,
  watermark,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  watermark: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-amber-200/40 bg-white/80 p-4 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-xl`} />
      <div
        className={`pointer-events-none absolute right-1 top-1 select-none text-4xl font-bold leading-none text-slate-900/[0.06]`}
        style={{ writingMode: "vertical-rl" }}
      >
        {watermark}
      </div>
      <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}>
        {icon}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</div>
    </div>
  );
}

/* ===================== 组件：Tab ===================== */
function CorpusTab({
  active,
  onClick,
  icon,
  labelZh,
  labelEn,
  count,
  accent,
  language,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  labelZh: string;
  labelEn: string;
  count: number;
  accent: "amber" | "rose";
  language: "zh" | "en";
}) {
  const activeBg =
    accent === "amber"
      ? "from-amber-500 to-orange-500 text-white shadow-md"
      : "from-rose-500 to-pink-500 text-white shadow-md";
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active
          ? `bg-gradient-to-r ${activeBg}`
          : "bg-white/60 text-slate-700 hover:bg-white border border-amber-200/50"
      }`}
    >
      {icon}
      <span>{language === "en" ? labelEn : labelZh}</span>
      <span
        className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-white/30" : "bg-slate-100 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ===================== 组件：词条库 ===================== */
function WordLibrary({
  words,
  onWordClick,
  t,
  language,
  searchQuery,
  selectedThemeId,
  themes,
  svgRefreshKey,
}: {
  words: Word[];
  onWordClick: (w: Word) => void;
  t: (zh: string, en: string) => string;
  language: "zh" | "en";
  searchQuery: string;
  selectedThemeId: string;
  themes: any[];
  svgRefreshKey: number;
}) {
  const { hasWordAudio } = useApp();
  
  if (words.length === 0) {
    return (
      <EmptyCorpus
        icon={<ScrollText className="h-8 w-8" />}
        titleZh="未找到匹配的词条"
        titleEn="No matching words"
        hintZh={searchQuery ? "换个关键词试试，或清除主题筛选" : "尝试上传第一条词条"}
        hintEn={searchQuery ? "Try another keyword, or clear the theme filter" : "Try uploading the first word"}
        t={t}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {words.map((w) => {
        const theme = themes.find((th) => th.id === w.theme);
        const themeNameZh = theme?.name?.zh || "未分类";
        const themeNameEn = theme?.name?.en || "Uncategorized";
        const wordHasAudio = hasWordAudio(w.id);
        return (
          <button
            key={w.id}
            onClick={() => onWordClick(w)}
            className="group relative overflow-hidden rounded-2xl border border-amber-200/40 bg-white p-3 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {/* 顶部主题色细线 */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-rose-400 to-emerald-400" />

            {/* 蒙古文 SVG */}
            <div className="mb-2 flex min-h-16 items-center justify-center bg-amber-50/50 rounded-lg">
              <MongolianTextImage
                wordId={w.id}
                type="word"
                src={getMongolianImageSrc(w.id)}
                alt={w.mongolian}
                fallbackText={w.mongolian}
                loading="lazy"
                decoding="async"
                expectedVersion={`${svgRefreshKey}-${w.mongolian}`}
                srcKey={w.id}
                className="w-8 h-auto"
                imgClassName="w-full h-auto"
              />
            </div>

            {/* 主行：当前语言释义 */}
            <div className="text-xs font-medium text-slate-900 line-clamp-1">
              {language === "zh"
                ? w.translation?.zh || ""
                : w.translation?.en || ""}
            </div>
            {/* 副行：拼音标注（与语种无关，永远是拉丁转写） */}
            <div className="mt-0.5 text-[10px] italic text-slate-500 line-clamp-1">
              {w.pinyin ? (
                <span className="tracking-wide">/{w.pinyin}/</span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>

            {/* 底部主题 chip */}
            <div className="mt-2 flex items-center gap-1">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 border border-emerald-200/50">
                {language === "zh" ? themeNameZh : themeNameEn}
              </span>
              
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] border ${
                  wordHasAudio
                    ? "bg-sky-50 text-sky-700 border-sky-200/70"
                    : "bg-slate-50 text-slate-400 border-slate-200/70"
                }`}
              >
              {wordHasAudio ? (
                <Volume2 className="h-3 w-3" />
              ) : (
                <VolumeX className="h-3 w-3" />
              )}
              {wordHasAudio
                ? language === "zh" ? "有音频" : "Audio"
                : language === "zh" ? "无音频" : "No audio"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== 组件：智慧语录库 ===================== */
function WisdomLibrary({
  quotes,
  onQuoteClick,
  t,
  language,
  svgRefreshKey,
}: {
  quotes: any[];
  onQuoteClick: (q: any) => void;
  t: (zh: string, en: string) => string;
  language: "zh" | "en";
  svgRefreshKey: number;
}) {
  if (quotes.length === 0) {
    return (
      <EmptyCorpus
        icon={<Sparkles className="h-8 w-8" />}
        titleZh="暂无智慧语录"
        titleEn="No wisdom quotes"
        hintZh="管理员可在管理员后台或通过上传按钮新增"
        hintEn="Admins can add new wisdom quotes"
        t={t}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {quotes.map((q) => {
        const titleZh = q.translation?.zh || q.definition?.zh || "";
        const titleEn = q.translation?.en || q.definition?.en || "";
        return (
          <button
            key={q.id}
            onClick={() => onQuoteClick(q)}
            className="group relative overflow-hidden rounded-2xl border border-rose-200/50 bg-gradient-to-br from-rose-50/80 via-white to-amber-50/60 p-4 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
          >
            {/* 顶部 5 色哈达 */}
            <div className="absolute top-0 left-2 right-2 flex h-0.5">
              <div className="flex-1 bg-sky-400" />
              <div className="flex-1 bg-white border-x border-rose-200" />
              <div className="flex-1 bg-amber-400" />
              <div className="flex-1 bg-emerald-400" />
              <div className="flex-1 bg-rose-500" />
            </div>

            <div className="pointer-events-none absolute right-2 top-2 select-none text-5xl font-bold leading-none text-rose-900/[0.06] group-hover:text-rose-900/[0.10] transition-colors">
              ❝
            </div>

            {/* 蒙古文 SVG */}
            <div className="mb-3 flex min-h-20 items-center justify-center bg-white/60 rounded-lg">
              <MongolianTextImage
                src={getMongolianWisdomImageSrc(q.id)}
                alt={q.mongolian}
                fallbackText={q.mongolian}
                loading="lazy"
                expectedVersion={svgRefreshKey}
                className="w-10 h-auto"
                imgClassName="w-full h-auto"
              />
            </div>

            <div className="text-sm font-medium text-slate-900 line-clamp-2">
              {language === "zh" ? titleZh : titleEn}
            </div>
            <div className="mt-1 text-xs text-slate-500 line-clamp-2">
              {language === "zh" ? titleEn : titleZh}
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
              <span>— {(language === "zh" ? q.author?.zh : q.author?.en) || "佚名"}</span>
              <Sparkles className="h-3 w-3 text-rose-500" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ===================== 组件：空状态 ===================== */
function EmptyCorpus({
  icon,
  titleZh,
  titleEn,
  hintZh,
  hintEn,
  t,
}: {
  icon: React.ReactNode;
  titleZh: string;
  titleEn: string;
  hintZh: string;
  hintEn: string;
  t: (zh: string, en: string) => string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-amber-300/50 bg-gradient-to-br from-amber-50/40 to-rose-50/40 p-12 text-center">
      <div className="pointer-events-none absolute right-4 top-4 select-none text-6xl font-bold text-amber-900/[0.06]" style={{ writingMode: "vertical-rl" }}>
        ᠪᠠᠢ᠍ᠠᠯ
      </div>
      <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        {icon}
      </div>
      <div className="text-lg font-semibold text-slate-800">{t(titleZh, titleEn)}</div>
      <div className="mt-1 text-sm text-slate-500">{t(hintZh, hintEn)}</div>
    </div>
  );
}
