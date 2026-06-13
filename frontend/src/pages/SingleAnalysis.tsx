import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RotateCcw, Clock, Hash, Type, Download, Flag } from 'lucide-react'
import toast from 'react-hot-toast'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { AnalysisCardSkeleton } from '@/components/ui/Skeleton'
import { SentimentCard } from '@/components/analysis/SentimentCard'
import { EmotionCard } from '@/components/analysis/EmotionCard'
import { ToneCard } from '@/components/analysis/ToneCard'
import { IntentCard } from '@/components/analysis/IntentCard'
import { InterpretationCard } from '@/components/analysis/InterpretationCard'
import { ResponseCard } from '@/components/analysis/ResponseCard'
import { LanguageCard } from '@/components/analysis/LanguageCard'
import { useAppStore } from '@/store'
import { analyzeText, exportSingleAnalysisPDF } from '@/lib/api'
import { SingleAnalysisResponse } from '@/types'
import { ReportModal } from '@/components/ReportModal'

const EXAMPLE_TEXTS = [
  "The product quality is absolutely amazing! Delivered within 2 days and works perfectly. Highly recommend to everyone!",
  "Very disappointed with the service. The delivery took 3 weeks and the product arrived damaged. Terrible customer support.",
  "यह प्रोडक्ट बहुत अच्छा है! डिलीवरी भी जल्दी हुई। मैं बहुत खुश हूं।",
  "Yaar ye product ekdum mast hai! Fast delivery bhi thi. Totally worth it!",
  "The product works as expected. Nothing extraordinary but gets the job done.",
  "Oh great, the package arrived 3 weeks late and half the items were missing. Absolutely fantastic service!",
]

export default function SingleAnalysis() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<SingleAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const { setLastAnalysis } = useAppStore()

  const handleExport = async () => {
    if (!result) return
    setExporting(true)
    try {
      await exportSingleAnalysisPDF(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  const handleAnalyze = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to analyze')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const data = await analyzeText(text)
      setResult(data)
      setLastAnalysis(data)
      toast.success('Analysis complete!')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Analysis failed. Make sure the backend is running.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setText('')
    setResult(null)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-1 gradient-text">Single Analysis</h1>
        <p className="text-slate-500">Analyze any text for comprehensive sentiment insights</p>
      </motion.div>

      {/* Input Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <div className="space-y-4">
            <Textarea
              label="Enter Text for Analysis"
              placeholder="Enter any text in English, Hindi, Bengali, Assamese, Hinglish, or other languages..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              characterCount
              maxLength={5000}
              className="font-sans text-base"
            />

            {/* Example texts */}
            <div>
              <p className="text-xs text-slate-500 mb-2">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_TEXTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setText(ex)}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-slate-400 hover:text-white transition-all max-w-xs truncate"
                    title={ex}
                  >
                    {ex.slice(0, 40)}...
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleAnalyze}
                loading={loading}
                size="lg"
                icon={<Sparkles size={18} />}
                className="flex-1 sm:flex-none"
              >
                {loading ? 'Analyzing...' : 'Analyze Text'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleClear}
                icon={<RotateCcw size={16} />}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Loading Skeletons */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {[...Array(6)].map((_, i) => <AnalysisCardSkeleton key={i} />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Export + Report buttons */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportOpen(true)}
                icon={<Flag size={14} />}
                className="text-red-400 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/10"
              >
                Report Issue
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                loading={exporting}
                icon={<Download size={14} />}
              >
                {exporting ? 'Exporting…' : 'Export PDF'}
              </Button>
            </div>

            <ReportModal
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              text={result.original_text}
              modelLabel={result.sentiment.label}
            />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Clock, label: 'Processing Time', value: `${result.processing_time}s` },
                { icon: Hash, label: 'Word Count', value: result.word_count },
                { icon: Type, label: 'Characters', value: result.char_count },
              ].map(({ icon: Icon, label, value }) => (
                <Card key={label} className="py-4">
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-indigo-400" />
                    <div>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-lg font-bold text-white">{value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Main Analysis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <LanguageCard
                detectedLanguage={result.detected_language}
                languageCode={result.language_code}
                translatedText={result.translated_text}
                isTranslation={result.is_translation}
                originalText={result.original_text}
              />
              <SentimentCard sentiment={result.sentiment} sarcasm={result.sarcasm} originalText={result.original_text} />
              <EmotionCard emotion={result.emotion} />
              <ToneCard tone={result.tone} />
              <IntentCard intent={result.intent} />
            </div>

            {/* Full-width Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <InterpretationCard interpretation={result.interpretation} />
              <ResponseCard suggestedResponse={result.suggested_response} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
