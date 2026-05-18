import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Sparkles, Download, Search, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { bulkAnalyze, uploadCSV } from '@/lib/api'
import { BulkAnalysisResponse, BulkAnalysisItem } from '@/types'
import { getSentimentBg, getEmotionColor, capitalize, truncateText, formatConfidence } from '@/lib/utils'
import { useAppStore } from '@/store'

type TabType = 'text' | 'csv'

export default function BulkAnalysis() {
  const [activeTab, setActiveTab] = useState<TabType>('text')
  const [bulkText, setBulkText] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvTexts, setCsvTexts] = useState<string[]>([])
  const [csvColumn, setCsvColumn] = useState('')
  const [result, setResult] = useState<BulkAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [sentimentFilter, setSentimentFilter] = useState<string>('all')
  const { setIsBulkAnalyzing } = useAppStore()
  const PAGE_SIZE = 15

  const processCsvFile = useCallback(async (file: File) => {
    setCsvLoading(true)
    try {
      const res = await uploadCSV(file)
      setCsvFile(file)
      setCsvTexts(res.texts)
      setCsvColumn(res.column_used)
      toast.success(`Loaded ${res.total} reviews from "${res.column_used}" column`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to parse CSV'
      toast.error(msg)
    } finally {
      setCsvLoading(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      processCsvFile(file)
    } else {
      toast.error('Please drop a valid CSV file')
    }
  }, [processCsvFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processCsvFile(e.target.files[0])
  }

  const handleAnalyze = async () => {
    let texts: string[] = []

    if (activeTab === 'text') {
      texts = bulkText.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    } else {
      texts = csvTexts
    }

    if (texts.length === 0) {
      toast.error('No texts to analyze')
      return
    }
    if (texts.length > 100) {
      texts = texts.slice(0, 100)
      toast('Limiting to first 100 texts for performance', { icon: '⚠️' })
    }

    setLoading(true)
    setIsBulkAnalyzing(true)
    setResult(null)
    setCurrentPage(1)

    try {
      const data = await bulkAnalyze(texts)
      setResult(data)
      toast.success(`Analyzed ${data.total} texts successfully!`)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Bulk analysis failed'
      toast.error(msg)
    } finally {
      setLoading(false)
      setIsBulkAnalyzing(false)
    }
  }

  const exportCSV = () => {
    if (!result) return
    const headers = ['#', 'Text', 'Language', 'Sentiment', 'Confidence', 'Emotion', 'Tone', 'Intent', 'Interpretation']
    const rows = result.items.map((item: BulkAnalysisItem) => [
      item.row_number,
      `"${item.original_text.replace(/"/g, '""')}"`,
      item.detected_language,
      item.sentiment.label,
      Math.round(item.sentiment.confidence * 100) + '%',
      item.emotion.label,
      item.tone.label,
      item.intent.label,
      `"${item.interpretation.replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sentiment_analysis_results.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Results exported!')
  }

  const filteredItems = (result?.items || []).filter((item: BulkAnalysisItem) => {
    const matchesSearch = !searchQuery || item.original_text.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSentiment = sentimentFilter === 'all' || item.sentiment.label === sentimentFilter
    return matchesSearch && matchesSentiment
  })
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE)
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const textLineCount = bulkText.split('\n').filter(t => t.trim()).length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-1 gradient-text">Bulk Analysis</h1>
        <p className="text-slate-400">Analyze multiple reviews at once — by text or CSV upload</p>
      </motion.div>

      {/* Input Section */}
      <Card>
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg w-fit">
          {(['text', 'csv'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'text' ? '📝 Text Input' : '📁 CSV Upload'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'text' ? (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Textarea
                label="Enter Reviews (one per line)"
                placeholder={`Great product, fast delivery!\nTerrible experience, product broke after 2 days.\nThe service is okay, nothing special.\nमुझे यह उत्पाद बहुत पसंद आया!`}
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={10}
                characterCount
              />
              <p className="text-xs text-slate-500 mt-2">
                {textLineCount} review{textLineCount !== 1 ? 's' : ''} detected
              </p>
            </motion.div>
          ) : (
            <motion.div key="csv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <Upload size={40} className="mx-auto text-indigo-400 mb-4" />
                <p className="text-white font-medium mb-1">Drop CSV file here or click to browse</p>
                <p className="text-slate-500 text-sm">
                  Supports CSV files with text / review / comment / feedback columns
                </p>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
              {csvLoading && (
                <div className="mt-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              )}
              {csvFile && !csvLoading && (
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-emerald-400 font-medium text-sm">{csvFile.name}</p>
                    <p className="text-slate-400 text-xs">
                      {csvTexts.length} reviews loaded from column "{csvColumn}"
                    </p>
                  </div>
                  <Badge variant="positive">{csvTexts.length} rows</Badge>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 mt-4">
          <Button
            onClick={handleAnalyze}
            loading={loading}
            size="lg"
            icon={<Sparkles size={18} />}
          >
            {loading ? 'Analyzing...' : 'Analyze All'}
          </Button>
          {result && (
            <Button
              variant="outline"
              size="lg"
              onClick={exportCSV}
              icon={<Download size={16} />}
            >
              Export CSV
            </Button>
          )}
        </div>
      </Card>

      {/* Loading Skeletons */}
      {loading && (
        <Card>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </Card>
      )}

      {/* Aggregate Stats + Results */}
      {result && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Total Analyzed',
                value: result.total,
                color: 'text-indigo-400',
              },
              {
                label: 'Dominant Sentiment',
                value: capitalize(result.aggregate.dominant_sentiment),
                color: result.aggregate.dominant_sentiment === 'positive'
                  ? 'text-emerald-400'
                  : result.aggregate.dominant_sentiment === 'negative'
                    ? 'text-red-400'
                    : 'text-gray-400',
              },
              {
                label: 'Dominant Emotion',
                value: result.aggregate.dominant_emotion,
                color: 'text-violet-400',
              },
              {
                label: 'Avg Confidence',
                value: formatConfidence(result.aggregate.average_confidence),
                color: 'text-cyan-400',
              },
            ].map(stat => (
              <Card key={stat.label} className="py-4">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </Card>
            ))}
          </div>

          {/* Sentiment Distribution */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Sentiment Distribution</CardTitle></CardHeader>
            <div className="space-y-3">
              {Object.entries(result.aggregate.sentiment_distribution).map(([sentiment, count]) => (
                <Progress
                  key={sentiment}
                  label={`${capitalize(sentiment)} (${count})`}
                  value={(count / result.total) * 100}
                  color={
                    sentiment === 'positive' ? '#10b981'
                    : sentiment === 'negative' ? '#ef4444'
                    : '#6b7280'
                  }
                  showValue
                />
              ))}
            </div>
          </Card>

          {/* Emotion Distribution */}
          <Card className="mb-6">
            <CardHeader><CardTitle>Emotion Distribution</CardTitle></CardHeader>
            <div className="space-y-3">
              {Object.entries(result.aggregate.emotion_distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, count]) => (
                  <Progress
                    key={emotion}
                    label={`${emotion} (${count})`}
                    value={(count / result.total) * 100}
                    color={getEmotionColor(emotion)}
                    showValue
                  />
                ))}
            </div>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Review-by-Review Results ({filteredItems.length})</CardTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    placeholder="Search reviews..."
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    icon={<Search size={14} />}
                    className="w-48 text-sm py-2"
                  />
                  <select
                    value={sentimentFilter}
                    onChange={e => { setSentimentFilter(e.target.value); setCurrentPage(1) }}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="all" className="bg-[#0f0f1a]">All Sentiments</option>
                    <option value="positive" className="bg-[#0f0f1a]">Positive</option>
                    <option value="negative" className="bg-[#0f0f1a]">Negative</option>
                    <option value="neutral" className="bg-[#0f0f1a]">Neutral</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    {['#', 'Review Text', 'Language', 'Sentiment', 'Emotion', 'Tone', 'Intent', 'Confidence'].map(h => (
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
                  {pagedItems.map((item: BulkAnalysisItem) => (
                    <React.Fragment key={item.row_number}>
                      <tr
                        className="hover:bg-white/3 transition-colors cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === item.row_number ? null : item.row_number)}
                      >
                        <td className="py-3 pr-4 text-sm text-slate-500">{item.row_number}</td>
                        <td className="py-3 pr-4 text-sm text-white max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{truncateText(item.original_text, 50)}</span>
                            {expandedRow === item.row_number
                              ? <ChevronUp size={14} className="flex-shrink-0 text-indigo-400" />
                              : <ChevronDown size={14} className="flex-shrink-0 text-slate-500" />
                            }
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm text-slate-400 whitespace-nowrap">
                          {item.detected_language}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSentimentBg(item.sentiment.label)}`}>
                            {capitalize(item.sentiment.label)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-sm" style={{ color: getEmotionColor(item.emotion.label) }}>
                          {item.emotion.label}
                        </td>
                        <td className="py-3 pr-4 text-sm text-slate-400">{capitalize(item.tone.label)}</td>
                        <td className="py-3 pr-4 text-sm text-slate-400">{capitalize(item.intent.label)}</td>
                        <td className="py-3 text-sm font-medium text-white">
                          {formatConfidence(item.sentiment.confidence)}
                        </td>
                      </tr>
                      {expandedRow === item.row_number && (
                        <tr key={`${item.row_number}-expand`}>
                          <td colSpan={8} className="pb-4 pt-0">
                            <div className="bg-white/3 rounded-xl p-4 space-y-3 ml-8 border border-white/5">
                              <div>
                                <p className="text-xs font-semibold text-slate-400 mb-1">Full Text</p>
                                <p className="text-sm text-white">{item.original_text}</p>
                              </div>
                              {item.detected_language !== 'English' && item.translated_text && (
                                <div>
                                  <p className="text-xs font-semibold text-indigo-400 mb-1">Translation (English)</p>
                                  <p className="text-sm text-slate-300">{item.translated_text}</p>
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-semibold text-slate-400 mb-1">Interpretation</p>
                                <p className="text-sm text-slate-300 italic">{item.interpretation}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-cyan-400 mb-1">Suggested Response</p>
                                <p className="text-sm text-slate-300 italic">"{item.suggested_response}"</p>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                                {[
                                  { label: 'Sentiment', value: capitalize(item.sentiment.label), color: getSentimentBg(item.sentiment.label) },
                                ].map(({ label, value, color }) => (
                                  <div key={label}>
                                    <p className="text-xs text-slate-500">{label}</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>{value}</span>
                                  </div>
                                ))}
                                <div>
                                  <p className="text-xs text-slate-500">Emotion</p>
                                  <p className="text-sm font-medium" style={{ color: getEmotionColor(item.emotion.label) }}>{item.emotion.label}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Tone</p>
                                  <p className="text-sm font-medium text-violet-400">{capitalize(item.tone.label)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Intent</p>
                                  <p className="text-sm font-medium text-cyan-400">{capitalize(item.intent.label)}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>

              {pagedItems.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-slate-500 text-sm">No results match your filter criteria.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <p className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages} · {filteredItems.length} results
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
