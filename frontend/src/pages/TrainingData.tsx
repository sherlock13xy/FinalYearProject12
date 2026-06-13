import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Zap, TrendingUp, TrendingDown, Minus, Trash2, Globe, CheckCircle2, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import {
  addCorrection, getCorrectionStats, retrainModel, getCorrections,
  deleteCorrection, fetchOnlineDataset, getOnlineStatus,
} from '@/lib/api'
import { CorrectionEntry, CorrectionStats } from '@/types'

const LABEL_CONFIG = {
  positive: { icon: TrendingUp,   color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)' },
  negative: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)' },
  neutral:  { icon: Minus,        color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)' },
} as const

type SentimentLabel = keyof typeof LABEL_CONFIG

export default function TrainingData() {
  const [text, setText] = useState('')
  const [correctLabel, setCorrectLabel] = useState<SentimentLabel | ''>('')
  const [keywordsInput, setKeywordsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fetchingOnline, setFetchingOnline] = useState(false)
  const [samplesPerClass, setSamplesPerClass] = useState(150)
  const [onlineStatus, setOnlineStatus] = useState<{ loaded: boolean; sample_count: number } | null>(null)
  const [stats, setStats] = useState<CorrectionStats | null>(null)
  const [entries, setEntries] = useState<CorrectionEntry[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [s, e, o] = await Promise.all([getCorrectionStats(), getCorrections(50), getOnlineStatus()])
      setStats(s); setEntries(e); setOnlineStatus(o)
    } catch { /* silent */ }
  }

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Please enter some text'); return }
    if (!correctLabel) { toast.error('Please select the correct sentiment label'); return }
    setSubmitting(true)
    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
      await addCorrection({ text: text.trim(), correct_label: correctLabel, keywords })
      toast.success('Correction saved!')
      setText(''); setCorrectLabel(''); setKeywordsInput('')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save correction')
    } finally { setSubmitting(false) }
  }

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const result = await retrainModel()
      toast.success(`Model retrained on ${result.corrections_used} corrections!`)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrain failed')
    } finally { setRetraining(false) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteCorrection(id)
      toast.success('Correction deleted')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally { setDeletingId(null) }
  }

  const handleFetchOnline = async () => {
    setFetchingOnline(true)
    try {
      const result = await fetchOnlineDataset(samplesPerClass)
      toast.success(`Fetched ${result.total_online} samples — model retrained on ${result.total_training} total!`)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fetch failed')
    } finally { setFetchingOnline(false) }
  }

  const progress = stats ? Math.min((stats.total / stats.retrain_threshold) * 100, 100) : 0
  const filteredEntries = search.trim()
    ? entries.filter(e =>
        e.text.toLowerCase().includes(search.toLowerCase()) ||
        e.correct_label.toLowerCase().includes(search.toLowerCase()) ||
        (e.model_label ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (e.keywords ?? []).some(k => k.toLowerCase().includes(search.toLowerCase()))
      )
    : entries

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <BookOpen size={28} className="text-indigo-400" />
          <h1 className="text-3xl font-bold gradient-text">Training Data</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-indigo-300"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>admin</span>
        </div>
        <p className="text-slate-500">Manually correct model predictions to improve accuracy</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left: Add correction */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-1 space-y-4">
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-sm font-semibold text-white">Add Correction</h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Text to correct</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
                placeholder="Paste the misclassified text here..."
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Correct sentiment</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LABEL_CONFIG) as SentimentLabel[]).map(lbl => {
                  const cfg = LABEL_CONFIG[lbl]; const Icon = cfg.icon; const isSel = correctLabel === lbl
                  return (
                    <button key={lbl} onClick={() => setCorrectLabel(lbl)}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all"
                      style={isSel ? { background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 16px ${cfg.color}30` }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Icon size={18} style={{ color: isSel ? cfg.color : '#6b7280' }} />
                      <span className="text-xs font-medium capitalize" style={{ color: isSel ? cfg.color : '#6b7280' }}>{lbl}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Keywords <span className="text-slate-600">(comma-separated, optional)</span></label>
              <input type="text" value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)}
                placeholder="e.g. great, fast delivery, recommend"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
            </div>

            <Button onClick={handleSubmit} loading={submitting} className="w-full">Save Correction</Button>
          </div>

          {/* Online Dataset */}
          <div className="rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-white">Online Dataset Training</h2>
              </div>
              {onlineStatus?.loaded && (
                <div className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 size={12} />{onlineStatus.sample_count.toLocaleString()} samples
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fetches labelled data from public HuggingFace datasets (Twitter, Hindi, Bengali) and retrains the model.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Samples per class:</span>
              <div className="flex gap-1.5">
                {[100, 150, 200, 300].map(n => (
                  <button key={n} onClick={() => setSamplesPerClass(n)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={samplesPerClass === n
                      ? { background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleFetchOnline} loading={fetchingOnline} variant="secondary" className="w-full" icon={<Globe size={14} />}>
              {fetchingOnline ? 'Fetching & Training...' : onlineStatus?.loaded ? 'Re-fetch & Retrain' : 'Fetch & Train from Online Datasets'}
            </Button>
          </div>
        </motion.div>

        {/* Right: Stats + entries */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="xl:col-span-2 space-y-4">

          {/* Stats card */}
          {stats && (
            <div className="rounded-2xl p-5 space-y-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Model Status</h2>
                <span className="text-xs text-slate-500">{stats.total} / {stats.retrain_threshold} corrections</span>
              </div>

              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: stats.needs_retrain ? 'linear-gradient(90deg,#10b981,#6ee7b7)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                  initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {(['positive', 'negative', 'neutral'] as const).map(lbl => (
                  <div key={lbl} className="rounded-xl p-4 text-center"
                    style={{ background: LABEL_CONFIG[lbl].bg, border: `1px solid ${LABEL_CONFIG[lbl].border}` }}>
                    <p className="text-2xl font-bold" style={{ color: LABEL_CONFIG[lbl].color }}>{stats.label_breakdown[lbl] || 0}</p>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">{lbl}</p>
                  </div>
                ))}
              </div>

              {stats.top_keywords.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Top keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.top_keywords.map(kw => (
                      <span key={kw.word} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                        {kw.word} ({kw.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleRetrain} loading={retraining}
                variant={stats.needs_retrain ? 'primary' : 'outline'}
                className="w-full" icon={<Zap size={15} />} disabled={stats.total === 0}>
                {retraining ? 'Retraining...' : `Retrain Model (${stats.total} corrections)`}
              </Button>
              {!stats.needs_retrain && stats.total < stats.retrain_threshold && (
                <p className="text-xs text-slate-600 text-center">
                  {stats.retrain_threshold - stats.total} more corrections recommended before retraining
                </p>
              )}
            </div>
          )}

          {/* Entries table */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 className="text-sm font-semibold text-white flex-shrink-0">
                All Corrections ({search ? filteredEntries.length + '/' + entries.length : entries.length})
              </h2>
              <div className="relative flex-1 max-w-xs ml-auto">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search corrections..."
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg text-xs text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <BookOpen size={32} className="mb-3 opacity-30" />
                <p>No corrections yet</p>
                <p className="text-xs mt-1">Add your first correction above</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {filteredEntries.map(entry => {
                  const cfg = LABEL_CONFIG[entry.correct_label as SentimentLabel]
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg?.color || '#6b7280' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{entry.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium capitalize" style={{ color: cfg?.color }}>{entry.correct_label}</span>
                          {entry.model_label && entry.model_label !== entry.correct_label && (
                            <span className="text-xs text-slate-600">← was {entry.model_label}</span>
                          )}
                          {entry.keywords && entry.keywords.length > 0 && (
                            <span className="text-xs text-slate-600">· {entry.keywords.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-600 flex-shrink-0">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                      <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20">
                        {deletingId === entry.id
                          ? <span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 size={13} className="text-slate-500 hover:text-red-400 transition-colors" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
