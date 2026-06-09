import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Link2, Youtube, Instagram, Search, ChevronDown, ChevronUp,
  AlertCircle, TrendingUp, Users, BarChart2, Zap, ExternalLink, Download,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAppStore } from '@/store'
import { analyzeURL, exportURLAnalysisPDF } from '@/lib/api'
import { BulkAnalysisItem, URLAnalysisResponse } from '@/types'
import { cn } from '@/lib/utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

function detectPlatform(url: string): 'youtube' | 'instagram' | null {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (['youtube.com', 'youtu.be', 'm.youtube.com'].includes(host)) return 'youtube'
    if (['instagram.com', 'm.instagram.com'].includes(host)) return 'instagram'
  } catch { /* not a valid URL yet */ }
  return null
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral:  'text-slate-400',
}
const SENTIMENT_BG: Record<string, string> = {
  positive: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
  negative: 'bg-red-500/15 border-red-500/30 text-red-400',
  neutral:  'bg-slate-500/15 border-slate-500/30 text-slate-400',
}
const SENTIMENT_BAR: Record<string, string> = {
  positive: 'bg-emerald-500',
  negative: 'bg-red-500',
  neutral:  'bg-slate-500',
}

function SentimentBadge({ label }: { label: string }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-semibold border capitalize', SENTIMENT_BG[label] ?? SENTIMENT_BG.neutral)}>
      {label}
    </span>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  if (platform === 'youtube') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400">
        <Youtube size={12} /> YouTube
      </span>
    )
  }
  if (platform === 'instagram') {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-500/15 border border-pink-500/30 text-pink-400">
        <Instagram size={12} /> Instagram
      </span>
    )
  }
  return null
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    indigo:  'from-indigo-500/20 to-indigo-600/10 border-indigo-500/20 text-indigo-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    violet:  'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
    amber:   'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
  }
  return (
    <div className={cn('rounded-xl border bg-gradient-to-br p-4', colors[color])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="opacity-70" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white capitalize">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function DistributionBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 capitalize truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{count} <span className="text-slate-600">({pct}%)</span></span>
    </div>
  )
}

function CommentRow({ item, index }: { item: BulkAnalysisItem; index: number }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-xs text-slate-600 w-6 flex-shrink-0 pt-0.5">{index + 1}</span>
        <p className="flex-1 text-sm text-slate-300 line-clamp-2 leading-relaxed">{item.original_text}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <SentimentBadge label={item.sentiment.label} />
          <span className="text-xs text-slate-500 hidden sm:block">{item.detected_language}</span>
          {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { label: 'Emotion',    value: item.emotion.label,    conf: item.emotion.confidence },
                { label: 'Tone',       value: item.tone.label,       conf: item.tone.intensity },
                { label: 'Intent',     value: item.intent.label,     conf: item.intent.confidence },
                { label: 'Confidence', value: `${Math.round(item.sentiment.confidence * 100)}%`, conf: null },
              ].map(({ label, value, conf }) => (
                <div key={label} className="bg-white/3 rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-white capitalize">{value}</p>
                  {conf !== null && (
                    <p className="text-[10px] text-slate-600">{Math.round(conf * 100)}%</p>
                  )}
                </div>
              ))}
            </div>
            {item.interpretation && (
              <div className="mx-4 mb-4 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-lg">
                <p className="text-[11px] text-slate-400 leading-relaxed">{item.interpretation}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── results panel ────────────────────────────────────────────────────────────

function ResultsPanel({ result }: { result: URLAnalysisResponse }) {
  const [search, setSearch] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportURLAnalysisPDF(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }
  const PAGE_SIZE = 15

  const { post, aggregate, items } = result

  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesSentiment = sentimentFilter === 'all' || item.sentiment.label === sentimentFilter
      const matchesSearch = !search || item.original_text.toLowerCase().includes(search.toLowerCase())
      return matchesSentiment && matchesSearch
    })
  }, [items, sentimentFilter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const sortedEmotions = Object.entries(aggregate.emotion_distribution)
    .sort(([, a], [, b]) => b - a).slice(0, 5)

  const topPositive = [...items]
    .filter(i => i.sentiment.label === 'positive')
    .sort((a, b) => b.sentiment.confidence - a.sentiment.confidence)[0]

  const topNegative = [...items]
    .filter(i => i.sentiment.label === 'negative')
    .sort((a, b) => b.sentiment.confidence - a.sentiment.confidence)[0]

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

      {/* Post metadata */}
      <div className="rounded-xl border border-white/8 p-4"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(124,58,237,0.05) 100%)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <PlatformBadge platform={post.platform as 'youtube' | 'reddit'} />
              <span className="text-xs text-slate-500">by {post.author}</span>
            </div>
            <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">{post.title}</h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={post.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
              <ExternalLink size={12} /> Open
            </a>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={12} />
              {exporting ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span>{post.fetched_comments} comments analysed</span>
          <span>·</span>
          <span>{post.total_available.toLocaleString()} total comments</span>
          <span>·</span>
          <span>{result.processing_time}s</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users}    label="Comments Analysed" value={String(result.total)}                         color="indigo" />
        <StatCard icon={TrendingUp} label="Dominant Sentiment" value={aggregate.dominant_sentiment}
          sub={`${Math.round(((aggregate.sentiment_distribution[aggregate.dominant_sentiment] ?? 0) / result.total) * 100)}% of comments`}
          color={aggregate.dominant_sentiment === 'positive' ? 'emerald' : aggregate.dominant_sentiment === 'negative' ? 'indigo' : 'indigo'} />
        <StatCard icon={Zap}      label="Dominant Emotion"   value={aggregate.dominant_emotion}                 color="violet" />
        <StatCard icon={BarChart2} label="Avg Confidence"    value={`${Math.round(aggregate.average_confidence * 100)}%`} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Sentiment distribution */}
        <div className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-xs font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart2 size={13} className="text-indigo-400" /> Sentiment Distribution
          </h3>
          <div className="space-y-3">
            {['positive', 'negative', 'neutral'].map(s => (
              <DistributionBar
                key={s} label={s}
                count={aggregate.sentiment_distribution[s] ?? 0}
                total={result.total}
                color={SENTIMENT_BAR[s]}
              />
            ))}
          </div>
        </div>

        {/* Emotion distribution */}
        <div className="rounded-xl border border-white/8 p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-xs font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Zap size={13} className="text-violet-400" /> Top Emotions
          </h3>
          <div className="space-y-3">
            {sortedEmotions.map(([emotion, count]) => (
              <DistributionBar
                key={emotion} label={emotion} count={count}
                total={result.total} color="bg-violet-500"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Highlighted comments */}
      {(topPositive || topNegative) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {topPositive && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-[10px] font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Most Positive Comment</p>
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">{topPositive.original_text}</p>
              <p className="text-[10px] text-emerald-500/70 mt-2">{Math.round(topPositive.sentiment.confidence * 100)}% confidence</p>
            </div>
          )}
          {topNegative && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-[10px] font-semibold text-red-400 mb-2 uppercase tracking-wider">Most Negative Comment</p>
              <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">{topNegative.original_text}</p>
              <p className="text-[10px] text-red-500/70 mt-2">{Math.round(topNegative.sentiment.confidence * 100)}% confidence</p>
            </div>
          )}
        </div>
      )}

      {/* Comments table */}
      <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-wrap">
          <h3 className="text-xs font-semibold text-slate-300 mr-auto">All Comments</h3>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search…"
              className="pl-7 pr-3 py-1.5 text-xs rounded-lg bg-white/5 border border-white/8 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 w-40"
            />
          </div>
          <select
            value={sentimentFilter} onChange={e => { setSentimentFilter(e.target.value); setPage(0) }}
            className="text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
        </div>

        <div>
          {paginated.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10">No comments match the filter.</p>
          ) : (
            paginated.map((item, i) => (
              <CommentRow key={item.row_number} item={item} index={page * PAGE_SIZE + i} />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-slate-500">{filtered.length} comments</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 disabled:opacity-30 hover:bg-white/10 transition-colors">
                Previous
              </button>
              <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded-lg bg-white/5 border border-white/8 text-slate-300 disabled:opacity-30 hover:bg-white/10 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function URLAnalysis() {
  const { lastURLAnalysis, isURLAnalyzing, setLastURLAnalysis, setIsURLAnalyzing } = useAppStore()

  const [url, setUrl] = useState('')
  const [maxComments, setMaxComments] = useState(20)
  const [error, setError] = useState<string | null>(null)

  const platform = detectPlatform(url)

  const handleAnalyse = async () => {
    if (!url.trim()) return
    setError(null)
    setLastURLAnalysis(null)
    setIsURLAnalyzing(true)
    try {
      const result = await analyzeURL(url.trim(), maxComments)
      setLastURLAnalysis(result)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setIsURLAnalyzing(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">URL Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">Paste a YouTube video or Instagram post URL to analyse its comment section.</p>
      </div>

      {/* Input card */}
      <div className="rounded-xl border border-white/8 p-5 space-y-4"
        style={{ background: 'linear-gradient(135deg, rgba(15,15,26,0.9) 0%, rgba(10,10,15,0.9) 100%)' }}>

        {/* URL input */}
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Post URL</label>
          <div className="relative">
            <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
              placeholder="https://www.youtube.com/watch?v=… or https://www.instagram.com/p/…"
              className="w-full pl-9 pr-32 py-2.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
            {platform && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <PlatformBadge platform={platform} />
              </div>
            )}
          </div>
        </div>

        {/* Max comments slider */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400">Comments to analyse</label>
            <span className="text-xs font-semibold text-indigo-400">{maxComments}</span>
          </div>
          <input
            type="range" min={5} max={100} step={5}
            value={maxComments} onChange={e => setMaxComments(Number(e.target.value))}
            className="w-full accent-indigo-500 h-1.5"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>5 (~30s)</span><span>100 (~10min)</span>
          </div>
        </div>

        {/* Analyse button */}
        <button
          onClick={handleAnalyse}
          disabled={!url.trim() || isURLAnalyzing}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)' }}
        >
          {isURLAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Fetching &amp; analysing comments…
            </span>
          ) : 'Analyse Comments'}
        </button>

        {/* Platform tips */}
        {!platform && !url && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {[
              { icon: Youtube,    label: 'YouTube',   example: 'youtube.com/watch?v=…',  color: 'text-red-400',  bg: 'bg-red-500/10 border-red-500/20' },
              { icon: Instagram,  label: 'Instagram', example: 'instagram.com/p/…',       color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
            ].map(({ icon: Icon, label, example, color, bg }) => (
              <div key={label} className={cn('rounded-lg border p-3', bg)}>
                <div className={cn('flex items-center gap-1.5 mb-1 text-xs font-semibold', color)}>
                  <Icon size={12} /> {label}
                </div>
                <p className="text-[10px] text-slate-500">{example}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {isURLAnalyzing && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-white/5" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-white/5" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-40 rounded-xl bg-white/5" />
            <div className="h-40 rounded-xl bg-white/5" />
          </div>
        </div>
      )}

      {/* Results */}
      {!isURLAnalyzing && lastURLAnalysis && (
        <ResultsPanel result={lastURLAnalysis} />
      )}
    </div>
  )
}
