import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BookOpen, Zap, TrendingUp, TrendingDown, Minus, Trash2, Globe,
  CheckCircle2, Flag, Eye, Check, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store'
import {
  addCorrection, getCorrectionStats, retrainModel, getCorrections, deleteCorrection,
  fetchOnlineDataset, getOnlineStatus, getReports, reviewReport, deleteReport, getReportStats,
} from '@/lib/api'
import { CorrectionEntry, CorrectionStats, UserReport, ReportStats } from '@/types'

const LABEL_CONFIG = {
  positive: { icon: TrendingUp,   color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)' },
  negative: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)' },
  neutral:  { icon: Minus,        color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)' },
} as const

type SentimentLabel = keyof typeof LABEL_CONFIG

const STATUS_CONFIG = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  label: 'Pending' },
  reviewed: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', label: 'Reviewed' },
  fixed:    { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Fixed' },
} as const

export function CorrectionPanel() {
  const { correctionPanelOpen, correctionPanelPrefill, correctionPanelSection, closeCorrectionPanel } = useAppStore()

  // Training section state
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
  const [recentEntries, setRecentEntries] = useState<CorrectionEntry[]>([])

  // Reports section state
  const [reports, setReports] = useState<UserReport[]>([])
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)
  const [reportFilter, setReportFilter] = useState<string>('pending')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [selectedCorrectLabel, setSelectedCorrectLabel] = useState<Record<string, SentimentLabel>>({})
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  useEffect(() => {
    if (correctionPanelOpen) {
      if (correctionPanelPrefill) {
        setText(correctionPanelPrefill.text)
        setCorrectLabel('')
        setKeywordsInput('')
      }
      loadAll()
    }
  }, [correctionPanelOpen])

  useEffect(() => {
    if (correctionPanelOpen) {
      loadReports()
    }
  }, [reportFilter, correctionPanelOpen])

  const loadAll = async () => {
    try {
      const [statsData, entries, online, rStats] = await Promise.all([
        getCorrectionStats(),
        getCorrections(10),
        getOnlineStatus(),
        getReportStats(),
      ])
      setStats(statsData)
      setRecentEntries(entries)
      setOnlineStatus(online)
      setReportStats(rStats)
    } catch { /* silent */ }
  }

  const loadReports = async () => {
    try {
      const data = await getReports(reportFilter || undefined)
      setReports(data)
    } catch { /* silent */ }
  }

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Please enter some text'); return }
    if (!correctLabel) { toast.error('Please select the correct sentiment label'); return }
    setSubmitting(true)
    try {
      const keywords = keywordsInput.split(',').map(k => k.trim()).filter(Boolean)
      await addCorrection({ text: text.trim(), correct_label: correctLabel, model_label: correctionPanelPrefill?.modelLabel, keywords })
      toast.success('Correction saved!')
      setText('')
      setCorrectLabel('')
      setKeywordsInput('')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save correction')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetrain = async () => {
    setRetraining(true)
    try {
      const result = await retrainModel()
      toast.success(`Model retrained on ${result.corrections_used} corrections!`)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Retrain failed')
    } finally {
      setRetraining(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteCorrection(id)
      toast.success('Correction deleted')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  const handleFetchOnline = async () => {
    setFetchingOnline(true)
    try {
      const result = await fetchOnlineDataset(samplesPerClass)
      toast.success(`Fetched ${result.total_online} samples — model retrained on ${result.total_training} total!`)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setFetchingOnline(false)
    }
  }

  const handleReviewReport = async (reportId: string, status: 'reviewed' | 'fixed') => {
    setReviewingId(reportId)
    try {
      const chosenLabel = selectedCorrectLabel[reportId]
      await reviewReport(reportId, { status, correct_label: status === 'fixed' ? chosenLabel : undefined })
      toast.success(status === 'fixed' ? 'Report fixed & added to dataset!' : 'Report marked as reviewed')
      await Promise.all([loadReports(), loadAll()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update report')
    } finally {
      setReviewingId(null)
    }
  }

  const handleDeleteReport = async (id: string) => {
    setDeletingReportId(id)
    try {
      await deleteReport(id)
      toast.success('Report deleted')
      await loadReports()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingReportId(null)
    }
  }

  const progress = stats ? Math.min((stats.total / stats.retrain_threshold) * 100, 100) : 0

  return (
    <AnimatePresence>
      {correctionPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={closeCorrectionPanel}
          />

          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 h-full w-[440px] z-50 flex flex-col overflow-hidden"
            style={{ background: 'rgba(8,8,20,0.98)', backdropFilter: 'blur(40px)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-8px 0 40px rgba(0,0,0,0.6)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <BookOpen size={14} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Training Data <span className="text-indigo-400 text-[10px] font-normal">(admin)</span>
                  </h2>
                  <p className="text-[10px] text-slate-500">{correctionPanelSection === 'reports' ? 'Review & fix user-reported issues' : 'Correct & improve the model'}</p>
                </div>
              </div>
              <button onClick={closeCorrectionPanel} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                <X size={14} />
              </button>
            </div>


            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* ── TRAINING DATA ── */}
              {correctionPanelSection === 'training' && (<>
                  {correctionPanelPrefill && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <span className="text-indigo-400">Model predicted:</span>
                      <span className="font-semibold text-white capitalize">{correctionPanelPrefill.modelLabel}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Text to correct</label>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Enter or paste the text..."
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
                            style={isSel ? { background: cfg.bg, border: `1px solid ${cfg.border}`, boxShadow: `0 0 12px ${cfg.color}30` }
                              : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <Icon size={16} style={{ color: isSel ? cfg.color : '#6b7280' }} />
                            <span className="text-xs font-medium capitalize" style={{ color: isSel ? cfg.color : '#6b7280' }}>{lbl}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">Keywords <span className="text-slate-600">(optional)</span></label>
                    <input type="text" value={keywordsInput} onChange={e => setKeywordsInput(e.target.value)} placeholder="e.g. great, fast delivery, recommend"
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')} />
                  </div>

                  <Button onClick={handleSubmit} loading={submitting} className="w-full">Save Correction</Button>

                  {stats !== null && (
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Corrections</span>
                        <span className="text-xs text-slate-500">{stats.total} / {stats.retrain_threshold}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: stats.needs_retrain ? 'linear-gradient(90deg,#10b981,#6ee7b7)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                          initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                      </div>
                      <div className="flex gap-2">
                        {(['positive', 'negative', 'neutral'] as const).map(lbl => (
                          <div key={lbl} className="flex-1 text-center">
                            <p className="text-lg font-bold" style={{ color: LABEL_CONFIG[lbl].color }}>{stats.label_breakdown[lbl] || 0}</p>
                            <p className="text-[10px] text-slate-600 capitalize">{lbl}</p>
                          </div>
                        ))}
                      </div>
                      {stats.top_keywords.length > 0 && (
                        <div>
                          <p className="text-[10px] text-slate-500 mb-1.5">Top keywords</p>
                          <div className="flex flex-wrap gap-1">
                            {stats.top_keywords.slice(0, 6).map(kw => (
                              <span key={kw.word} className="text-[10px] px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                                {kw.word} ({kw.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button onClick={handleRetrain} loading={retraining} variant={stats.needs_retrain ? 'primary' : 'outline'} className="w-full" icon={<Zap size={14} />} disabled={stats.total === 0}>
                        {retraining ? 'Retraining...' : `Retrain Model (${stats.total} corrections)`}
                      </Button>
                      {!stats.needs_retrain && stats.total < stats.retrain_threshold && (
                        <p className="text-[10px] text-slate-600 text-center">{stats.retrain_threshold - stats.total} more corrections recommended</p>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Globe size={13} className="text-indigo-400" /><span className="text-xs font-semibold text-slate-300">Online Dataset Training</span></div>
                      {onlineStatus?.loaded && <div className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={10} />{onlineStatus.sample_count.toLocaleString()} samples</div>}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">Fetches labelled data from public HuggingFace datasets and retrains the model.</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">Samples per class:</span>
                      <div className="flex gap-1">
                        {[100, 150, 200, 300].map(n => (
                          <button key={n} onClick={() => setSamplesPerClass(n)} className="px-2 py-0.5 rounded text-[10px] font-medium transition-all"
                            style={samplesPerClass === n ? { background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }
                              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleFetchOnline} loading={fetchingOnline} variant="secondary" className="w-full" icon={<Globe size={13} />}>
                      {fetchingOnline ? 'Fetching & Training...' : onlineStatus?.loaded ? 'Re-fetch & Retrain' : 'Fetch & Train from Online Datasets'}
                    </Button>
                  </div>

                  {recentEntries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-2">Recent corrections</p>
                      <div className="space-y-2">
                        {recentEntries.map(entry => {
                          const cfg = LABEL_CONFIG[entry.correct_label as SentimentLabel]
                          return (
                            <div key={entry.id} className="flex items-start gap-2 rounded-lg p-2.5 group"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: cfg?.color || '#6b7280' }} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-300 truncate">{entry.text}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-medium capitalize" style={{ color: cfg?.color }}>{entry.correct_label}</span>
                                  {entry.model_label && entry.model_label !== entry.correct_label && <span className="text-[10px] text-slate-600">← was {entry.model_label}</span>}
                                </div>
                              </div>
                              <button onClick={() => handleDelete(entry.id)} disabled={deletingId === entry.id}
                                className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20">
                                {deletingId === entry.id ? <span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={11} className="text-slate-500 hover:text-red-400 transition-colors" />}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
              </>)}

              {/* ── USER REPORTS ── */}
              {correctionPanelSection === 'reports' && (
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <Flag size={14} className="text-red-400" />
                  <span className="text-sm font-semibold text-white">User Reports</span>
                  {reportStats && reportStats.pending > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#ef4444' }}>
                      {reportStats.pending} pending
                    </span>
                  )}
                </div>
                  {reportStats && (
                    <div className="grid grid-cols-3 gap-2">
                      {(['pending', 'reviewed', 'fixed'] as const).map(s => {
                        const cfg = STATUS_CONFIG[s]
                        return (
                          <div key={s} className="rounded-xl p-3 text-center" style={{ background: cfg.bg, border: `1px solid ${cfg.color}40` }}>
                            <p className="text-lg font-bold" style={{ color: cfg.color }}>{reportStats[s]}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{s}</p>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="flex gap-1.5">
                    {(['pending', 'reviewed', 'fixed', ''] as const).map(f => (
                      <button key={f} onClick={() => setReportFilter(f)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize"
                        style={reportFilter === f ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }
                          : { color: '#6b7280', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {f === '' ? 'All' : f}
                      </button>
                    ))}
                  </div>

                  {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                      <Flag size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">No reports</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports.map(report => {
                        const statusCfg = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]
                        const isReviewing = reviewingId === report.id
                        const isDeleting = deletingReportId === report.id
                        const chosenLabel = selectedCorrectLabel[report.id]

                        return (
                          <div key={report.id} className="rounded-xl p-3.5 space-y-2.5"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: statusCfg.bg, color: statusCfg.color }}>{statusCfg.label}</span>
                                {report.reporter_username && <span className="text-[10px] text-slate-600">by {report.reporter_username}</span>}
                                {report.model_label && <span className="text-[10px] text-slate-600">predicted: <span className="text-slate-400 capitalize">{report.model_label}</span></span>}
                              </div>
                              <button onClick={() => handleDeleteReport(report.id)} disabled={isDeleting}
                                className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                {isDeleting ? <span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={11} />}
                              </button>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{report.text}</p>

                            {report.user_note && (
                              <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <AlertCircle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-amber-200/70 leading-relaxed">{report.user_note}</p>
                              </div>
                            )}

                            {report.status !== 'fixed' && (
                              <div className="space-y-2 pt-1">
                                <div>
                                  <p className="text-[10px] text-slate-500 mb-1.5">Correct label (required to Fix):</p>
                                  <div className="flex gap-1.5">
                                    {(Object.keys(LABEL_CONFIG) as SentimentLabel[]).map(lbl => {
                                      const cfg = LABEL_CONFIG[lbl]; const Icon = cfg.icon; const isSel = chosenLabel === lbl
                                      return (
                                        <button key={lbl} onClick={() => setSelectedCorrectLabel(prev => ({ ...prev, [report.id]: lbl }))}
                                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize"
                                          style={isSel ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }}>
                                          <Icon size={11} />{lbl}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleReviewReport(report.id, 'reviewed')} disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                                    {isReviewing ? <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Eye size={11} />}
                                    Reviewed
                                  </button>
                                  <button onClick={() => { if (!chosenLabel) { toast.error('Select a correct label first'); return } handleReviewReport(report.id, 'fixed') }} disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#6ee7b7' }}>
                                    {isReviewing ? <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Check size={11} />}
                                    Fix & Add to Dataset
                                  </button>
                                </div>
                              </div>
                            )}

                            {report.status === 'fixed' && (
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                                <CheckCircle2 size={11} /> Fixed and added to training dataset
                              </div>
                            )}

                            <p className="text-[10px] text-slate-700">
                              {new Date(report.created_at).toLocaleDateString()} {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
