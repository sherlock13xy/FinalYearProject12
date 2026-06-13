import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flag, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { submitReport } from '@/lib/api'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  text: string
  modelLabel?: string
}

const LABEL_CONFIG = {
  positive: { icon: TrendingUp, color: '#10b981' },
  negative: { icon: TrendingDown, color: '#ef4444' },
  neutral: { icon: Minus, color: '#6b7280' },
} as const

export function ReportModal({ open, onClose, text, modelLabel }: ReportModalProps) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submitReport({ text, model_label: modelLabel, user_note: note || undefined })
      setSubmitted(true)
      toast.success('Report submitted! The admin will review it.')
      setTimeout(() => {
        setSubmitted(false)
        setNote('')
        onClose()
      }, 1800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setNote('')
      setSubmitted(false)
      onClose()
    }
  }

  const LabelIcon = modelLabel && modelLabel in LABEL_CONFIG
    ? LABEL_CONFIG[modelLabel as keyof typeof LABEL_CONFIG].icon
    : AlertCircle

  const labelColor = modelLabel && modelLabel in LABEL_CONFIG
    ? LABEL_CONFIG[modelLabel as keyof typeof LABEL_CONFIG].color
    : '#6b7280'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(10,10,25,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <Flag size={16} className="text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Report Incorrect Analysis</h3>
                    <p className="text-[10px] text-slate-500">Help improve the model</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={14} />
                </button>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    <Flag size={24} className="text-emerald-400" />
                  </div>
                  <p className="text-white font-semibold">Report Submitted!</p>
                  <p className="text-xs text-slate-500 text-center">The admin will review and fix this analysis.</p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {/* Reported text preview */}
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Reported text</p>
                    <div
                      className="rounded-xl px-3 py-2.5 text-sm text-slate-300 line-clamp-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {text}
                    </div>
                  </div>

                  {/* Model prediction */}
                  {modelLabel && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-500">Model predicted:</p>
                      <div className="flex items-center gap-1.5">
                        <LabelIcon size={13} style={{ color: labelColor }} />
                        <span className="text-xs font-semibold capitalize" style={{ color: labelColor }}>
                          {modelLabel}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 ml-1">— you think this is wrong</span>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      What's wrong? <span className="text-slate-600">(optional)</span>
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="e.g. This is clearly sarcastic, the sentiment should be negative..."
                      maxLength={1000}
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 resize-none outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onFocus={(e) => (e.target.style.borderColor = 'rgba(239,68,68,0.4)')}
                      onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                    />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      loading={submitting}
                      className="flex-1"
                      icon={<Flag size={14} />}
                    >
                      Submit Report
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
