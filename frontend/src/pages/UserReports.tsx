import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flag, TrendingUp, TrendingDown, Minus, Trash2, Eye, Check,
  AlertCircle, CheckCircle2, ChevronDown, Search, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getReports, reviewReport, deleteReport, getReportStats } from '@/lib/api'
import { UserReport, ReportStats } from '@/types'
import { useAppStore } from '@/store'

const LABEL_CONFIG = {
  positive: { icon: TrendingUp,   color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.4)' },
  negative: { icon: TrendingDown, color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)' },
  neutral:  { icon: Minus,        color: '#6b7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)' },
} as const

type SentimentLabel = keyof typeof LABEL_CONFIG

const STATUS_CONFIG = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pending' },
  reviewed: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Reviewed' },
  fixed:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Fixed' },
} as const

export default function UserReports() {
  const { setPendingReportCount } = useAppStore()
  const [reports, setReports] = useState<UserReport[]>([])
  const [reportStats, setReportStats] = useState<ReportStats | null>(null)
  const [filter, setFilter] = useState<string>('pending')
  const [sortAsc, setSortAsc] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState<Record<string, SentimentLabel>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [filter])

  const loadAll = async () => {
    try {
      const [r, s] = await Promise.all([getReports(filter || undefined), getReportStats()])
      setReports(r); setReportStats(s)
      setPendingReportCount(s.pending)
    } catch { /* silent */ }
  }

  const handleReview = async (id: string, status: 'reviewed' | 'fixed') => {
    setReviewingId(id)
    try {
      const label = selectedLabel[id]
      await reviewReport(id, { status, correct_label: status === 'fixed' ? label : undefined })
      toast.success(status === 'fixed' ? 'Report fixed & added to dataset!' : 'Marked as reviewed')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update report')
    } finally { setReviewingId(null) }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteReport(id)
      toast.success('Report deleted')
      if (expandedId === id) setExpandedId(null)
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally { setDeletingId(null) }
  }

  const filteredReports = searchUser.trim()
    ? reports.filter(r =>
        (r.reporter_username ?? '').toLowerCase().includes(searchUser.toLowerCase())
      )
    : reports

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Flag size={28} className="text-red-400" />
          <h1 className="text-3xl font-bold gradient-text">User Reports</h1>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium text-red-300"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>admin</span>
        </div>
        <p className="text-slate-500">Review issues reported by users and fix incorrect model predictions</p>
      </motion.div>

      {/* Stats row */}
      {reportStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total',    value: reportStats.total,    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
            { label: 'Pending',  value: reportStats.pending,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
            { label: 'Reviewed', value: reportStats.reviewed, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
            { label: 'Fixed',    value: reportStats.fixed,    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5 text-center"
              style={{ background: s.bg, border: `1px solid ${s.color}30` }}>
              <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filter bar + sort */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'reviewed', 'fixed', ''] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize"
              style={filter === f
                ? { background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.4)' }
                : { color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              {f === '' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Username search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchUser}
              onChange={e => setSearchUser(e.target.value)}
              placeholder="Search by username..."
              className="pl-8 pr-8 py-2 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all w-48"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
            />
            {searchUser && (
              <button onClick={() => setSearchUser('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={() => setSortAsc(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d={sortAsc ? 'M3 10L7 4L11 10' : 'M3 4L7 10L11 4'}
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {sortAsc ? 'Oldest first' : 'Newest first'}
          </button>
        </div>
      </motion.div>

      {/* Reports list */}
      {filteredReports.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-slate-600">
          <Flag size={40} className="mb-4 opacity-20" />
          <p className="text-lg">No reports</p>
          <p className="text-sm mt-1">No {filter || ''} reports found</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {[...filteredReports].sort((a, b) => {
              const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              return sortAsc ? diff : -diff
            }).map((report, i) => {
            const statusCfg = STATUS_CONFIG[report.status as keyof typeof STATUS_CONFIG]
            const isExpanded = expandedId === report.id
            const isReviewing = reviewingId === report.id
            const isDeleting = deletingId === report.id
            const chosenLabel = selectedLabel[report.id]

            return (
              <div key={report.id}
                style={{ borderBottom: i < filteredReports.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>

                {/* ── Collapsed row (single line) ── */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  {/* Status badge */}
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}>
                    {statusCfg.label}
                  </span>

                  {/* Reporter */}
                  {report.reporter_username && (
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {report.reporter_username}
                    </span>
                  )}

                  {/* Predicted label */}
                  {report.model_label && (
                    <span className="text-xs text-slate-600 flex-shrink-0 hidden sm:block">
                      predicted: <span className="text-slate-400 capitalize">{report.model_label}</span>
                    </span>
                  )}

                  {/* Text preview — truncated single line */}
                  <p className="flex-1 text-sm text-slate-400 truncate min-w-0">
                    {report.text}
                  </p>

                  {/* Date */}
                  <span className="text-xs text-slate-600 flex-shrink-0 hidden md:block">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(report.id) }}
                    disabled={isDeleting}
                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    {isDeleting
                      ? <span className="w-3 h-3 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={13} />}
                  </button>

                  {/* Chevron */}
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0">
                    <ChevronDown size={15} className="text-slate-600" />
                  </motion.div>
                </div>

                {/* ── Expanded detail ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="px-5 pb-5 pt-2 space-y-4"
                        style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>

                        {/* Full text */}
                        <div className="rounded-xl px-4 py-3"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <p className="text-sm text-slate-300 leading-relaxed">{report.text}</p>
                        </div>

                        {/* User note */}
                        {report.user_note && (
                          <div className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <AlertCircle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-200/80 leading-relaxed">{report.user_note}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {report.status !== 'fixed' ? (
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Select correct label to fix:</p>
                              <div className="flex gap-2">
                                {(Object.keys(LABEL_CONFIG) as SentimentLabel[]).map(lbl => {
                                  const cfg = LABEL_CONFIG[lbl]; const Icon = cfg.icon; const isSel = chosenLabel === lbl
                                  return (
                                    <button key={lbl}
                                      onClick={() => setSelectedLabel(prev => ({ ...prev, [report.id]: lbl }))}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all capitalize"
                                      style={isSel
                                        ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
                                      <Icon size={13} />{lbl}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleReview(report.id, 'reviewed')} disabled={isReviewing}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all"
                                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                                {isReviewing ? <span className="w-3.5 h-3.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <Eye size={13} />}
                                Mark Reviewed
                              </button>
                              <button
                                onClick={() => {
                                  if (!chosenLabel) { toast.error('Select a correct label first'); return }
                                  handleReview(report.id, 'fixed')
                                }}
                                disabled={isReviewing}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all"
                                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                                {isReviewing ? <span className="w-3.5 h-3.5 border border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <Check size={13} />}
                                Fix & Add to Dataset
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <CheckCircle2 size={14} className="text-emerald-400" />
                            <p className="text-sm text-emerald-400">Fixed and added to training dataset</p>
                          </div>
                        )}

                        <p className="text-xs text-slate-600">
                          {new Date(report.created_at).toLocaleDateString()} · {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
