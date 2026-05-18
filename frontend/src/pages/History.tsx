import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Search, Trash2, Trash, ChevronDown, ChevronUp,
  RefreshCw, Filter, Globe, MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { getHistory, deleteHistoryRecord, clearHistory } from '@/lib/api'
import { HistoryRecord } from '@/types'
import {
  getSentimentBg, getEmotionColor, capitalize,
  truncateText, formatDate, formatConfidence
} from '@/lib/utils'

const PAGE_SIZE = 20

export default function History() {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [clearingAll, setClearingAll] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getHistory({
        page: currentPage,
        page_size: PAGE_SIZE,
        sentiment: sentimentFilter || undefined,
        search: searchQuery || undefined,
      })
      setRecords(data.items)
      setTotal(data.total)
      setTotalPages(data.pages)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load history'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [currentPage, sentimentFilter, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory()
    }, 300)
    return () => clearTimeout(timer)
  }, [fetchHistory])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteHistoryRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
      toast.success('Record deleted')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete record'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 5000)
      return
    }
    setClearingAll(true)
    try {
      await clearHistory()
      setRecords([])
      setTotal(0)
      setTotalPages(1)
      setCurrentPage(1)
      setConfirmClear(false)
      toast.success('All history cleared')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to clear history'
      toast.error(msg)
    } finally {
      setClearingAll(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleSentimentFilter = (value: string) => {
    setSentimentFilter(value)
    setCurrentPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 gradient-text">Analysis History</h1>
          <p className="text-slate-400">
            Browse all past analyses — {total} records total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            loading={loading}
            icon={<RefreshCw size={14} />}
          >
            Refresh
          </Button>
          {total > 0 && (
            <Button
              variant={confirmClear ? 'danger' : 'outline'}
              size="sm"
              onClick={handleClearAll}
              loading={clearingAll}
              icon={<Trash size={14} />}
            >
              {confirmClear ? 'Confirm Clear All' : 'Clear All'}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={16} />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <Input
              placeholder="Search text, language..."
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              icon={<Search size={14} />}
              className="w-60 text-sm py-2"
            />
            <select
              value={sentimentFilter}
              onChange={e => handleSentimentFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
            >
              <option value="" className="bg-[#0f0f1a]">All Sentiments</option>
              <option value="positive" className="bg-[#0f0f1a]">Positive</option>
              <option value="negative" className="bg-[#0f0f1a]">Negative</option>
              <option value="neutral" className="bg-[#0f0f1a]">Neutral</option>
            </select>
            {(searchQuery || sentimentFilter) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSentimentFilter('')
                  setCurrentPage(1)
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Content */}
      {loading ? (
        <Card>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        </Card>
      ) : records.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Clock size={32} className="text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No History Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                {searchQuery || sentimentFilter
                  ? 'No records match your current filters. Try adjusting them.'
                  : 'Start analyzing text to build your history.'}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>History Records</CardTitle>
                <span className="text-sm text-slate-400">
                  {records.length} of {total} records
                </span>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    {['Date', 'Text', 'Language', 'Mode', 'Sentiment', 'Emotion', 'Tone', 'Intent', 'Confidence', 'Actions'].map(h => (
                      <th
                        key={h}
                        className="pb-3 pr-4 text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((record) => (
                    <React.Fragment key={record.id}>
                      <tr
                        className="hover:bg-white/3 transition-colors"
                      >
                        {/* Date */}
                        <td className="py-3 pr-4 text-xs text-slate-400 whitespace-nowrap">
                          {formatDate(record.created_at)}
                        </td>

                        {/* Text with expand toggle */}
                        <td className="py-3 pr-4 text-sm text-white max-w-xs">
                          <button
                            onClick={() => setExpandedRow(expandedRow === record.id ? null : record.id)}
                            className="flex items-center gap-1.5 text-left hover:text-indigo-300 transition-colors"
                          >
                            <span className="truncate max-w-[180px]">
                              {truncateText(record.original_text, 45)}
                            </span>
                            {expandedRow === record.id
                              ? <ChevronUp size={14} className="flex-shrink-0 text-indigo-400" />
                              : <ChevronDown size={14} className="flex-shrink-0 text-slate-500" />
                            }
                          </button>
                        </td>

                        {/* Language */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Globe size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                              {record.detected_language}
                            </span>
                          </div>
                        </td>

                        {/* Mode */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-400 capitalize whitespace-nowrap">
                              {record.mode}
                            </span>
                          </div>
                        </td>

                        {/* Sentiment */}
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSentimentBg(record.sentiment.label)}`}>
                            {capitalize(record.sentiment.label)}
                          </span>
                        </td>

                        {/* Emotion */}
                        <td
                          className="py-3 pr-4 text-sm font-medium"
                          style={{ color: getEmotionColor(record.emotion.label) }}
                        >
                          {record.emotion.label}
                        </td>

                        {/* Tone */}
                        <td className="py-3 pr-4 text-sm text-slate-400">
                          {capitalize(record.tone.label)}
                        </td>

                        {/* Intent */}
                        <td className="py-3 pr-4 text-sm text-slate-400">
                          {capitalize(record.intent.label)}
                        </td>

                        {/* Confidence */}
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${record.sentiment.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300 whitespace-nowrap">
                              {formatConfidence(record.sentiment.confidence)}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3">
                          <button
                            onClick={() => handleDelete(record.id)}
                            disabled={deletingId === record.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            title="Delete record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      <AnimatePresence>
                        {expandedRow === record.id && (
                          <tr key={`${record.id}-detail`}>
                            <td colSpan={10} className="pb-4 pt-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white/3 rounded-xl p-4 space-y-4 ml-4 border border-white/5"
                              >
                                {/* Full Text */}
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                                    Full Text
                                  </p>
                                  <p className="text-sm text-white">{record.original_text}</p>
                                </div>

                                {/* Translation if applicable */}
                                {record.detected_language !== 'English' && record.translated_text && (
                                  <div>
                                    <p className="text-xs font-semibold text-indigo-400 mb-1 uppercase tracking-wide">
                                      English Translation
                                    </p>
                                    <p className="text-sm text-slate-300">{record.translated_text}</p>
                                  </div>
                                )}

                                {/* Scores Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Sentiment Probs</p>
                                    {Object.entries(record.sentiment.probabilities).map(([k, v]) => (
                                      <div key={k} className="flex justify-between text-xs">
                                        <span className="text-slate-400 capitalize">{k}</span>
                                        <span className="text-white">{Math.round(v * 100)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Top Emotions</p>
                                    {Object.entries(record.emotion.scores)
                                      .sort(([, a], [, b]) => b - a)
                                      .slice(0, 3)
                                      .map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-xs">
                                          <span className="text-slate-400">{k}</span>
                                          <span className="text-white">{Math.round(v * 100)}%</span>
                                        </div>
                                      ))}
                                  </div>
                                  <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Top Tones</p>
                                    {Object.entries(record.tone.scores)
                                      .sort(([, a], [, b]) => b - a)
                                      .slice(0, 3)
                                      .map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-xs">
                                          <span className="text-slate-400 capitalize">{k}</span>
                                          <span className="text-white">{Math.round(v * 100)}%</span>
                                        </div>
                                      ))}
                                  </div>
                                  <div className="bg-white/5 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">Top Intents</p>
                                    {Object.entries(record.intent.scores)
                                      .sort(([, a], [, b]) => b - a)
                                      .slice(0, 3)
                                      .map(([k, v]) => (
                                        <div key={k} className="flex justify-between text-xs">
                                          <span className="text-slate-400 capitalize">{k}</span>
                                          <span className="text-white">{Math.round(v * 100)}%</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>

                                {/* Interpretation */}
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                                    Interpretation
                                  </p>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {record.interpretation}
                                  </p>
                                </div>

                                {/* Suggested Response */}
                                <div>
                                  <p className="text-xs font-semibold text-cyan-400 mb-1 uppercase tracking-wide">
                                    Suggested Response
                                  </p>
                                  <p className="text-sm text-slate-300 italic">
                                    "{record.suggested_response}"
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                  <Badge variant="primary">
                                    {record.processing_time}s processing
                                  </Badge>
                                  <Badge variant="default">
                                    {record.mode} mode
                                  </Badge>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} · {total} total records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>

                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let page: number
                      if (totalPages <= 5) {
                        page = i + 1
                      } else if (currentPage <= 3) {
                        page = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                      } else {
                        page = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}
