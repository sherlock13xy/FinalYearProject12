import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts'
import {
  RefreshCw, TrendingUp, Heart, Volume2,
  Target, MessageSquare, Sparkles, Activity
} from 'lucide-react'
import { getAnalytics } from '@/lib/api'
import { AnalyticsData } from '@/types'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getSentimentColor, capitalize, formatDate } from '@/lib/utils'
import { useAppStore } from '@/store'
import toast from 'react-hot-toast'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
}
const EMOTION_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6']

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const { setAnalytics: storeAnalytics } = useAppStore()

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const data = await getAnalytics()
      setAnalytics(data)
      storeAnalytics(data)
    } catch (error: unknown) {
      toast.error('Failed to load analytics. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  const sentimentPieData = analytics
    ? Object.entries(analytics.sentiment_distribution).map(([name, value]) => ({
        name: capitalize(name),
        value,
      }))
    : []

  const emotionBarData = analytics
    ? Object.entries(analytics.emotion_distribution).map(([name, value]) => ({ name, value }))
    : []

  const kpiCards = analytics
    ? [
        {
          label: 'Total Analyzed',
          value: analytics.total_analyzed,
          icon: MessageSquare,
          colorClass: 'text-indigo-400',
          bgClass: 'bg-indigo-500/10',
        },
        {
          label: 'Dominant Sentiment',
          value: capitalize(analytics.dominant_sentiment),
          icon: TrendingUp,
          colorClass:
            analytics.dominant_sentiment === 'positive' ? 'text-emerald-400'
            : analytics.dominant_sentiment === 'negative' ? 'text-red-400'
            : 'text-gray-400',
          bgClass: 'bg-emerald-500/10',
        },
        {
          label: 'Dominant Emotion',
          value: analytics.dominant_emotion,
          icon: Heart,
          colorClass: 'text-violet-400',
          bgClass: 'bg-violet-500/10',
        },
        {
          label: 'Dominant Tone',
          value: capitalize(analytics.dominant_tone),
          icon: Volume2,
          colorClass: 'text-cyan-400',
          bgClass: 'bg-cyan-500/10',
        },
        {
          label: 'Dominant Intent',
          value: capitalize(analytics.dominant_intent),
          icon: Target,
          colorClass: 'text-amber-400',
          bgClass: 'bg-amber-500/10',
        },
        {
          label: 'Avg Confidence',
          value: `${Math.round(analytics.average_confidence * 100)}%`,
          icon: Activity,
          colorClass: 'text-emerald-400',
          bgClass: 'bg-emerald-500/10',
        },
      ]
    : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1 gradient-text">Dashboard</h1>
          <p className="text-slate-500">Real-time sentiment intelligence overview</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          {kpiCards.map(({ label, value, icon: Icon, colorClass, bgClass }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="py-4">
                <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center mb-3`}>
                  <Icon size={20} className={colorClass} />
                </div>
                <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* AI Insight */}
      {analytics && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-300 mb-1">AI Insight Summary</p>
                <p className="text-slate-300 text-sm leading-relaxed">{analytics.ai_insight}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : analytics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Sentiment Pie Chart */}
          <Card>
            <CardHeader><CardTitle>Sentiment Distribution</CardTitle></CardHeader>
            {sentimentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sentimentPieData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={SENTIMENT_COLORS[entry.name.toLowerCase()] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1e1e2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#94a3b8' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                No data yet. Start analyzing text!
              </div>
            )}
          </Card>

          {/* Emotion Bar Chart */}
          <Card>
            <CardHeader><CardTitle>Emotion Distribution</CardTitle></CardHeader>
            {emotionBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={emotionBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: '#1e1e2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {emotionBarData.map((_, index) => (
                      <Cell key={index} fill={EMOTION_COLORS[index % EMOTION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
                No data yet. Start analyzing text!
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Trend Line Chart */}
      {analytics && analytics.trend_data && analytics.trend_data.length > 0 && !loading && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader><CardTitle>Sentiment Trends (Last 30 Days)</CardTitle></CardHeader>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.trend_data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#94a3b8' }}>{capitalize(value)}</span>
                  )}
                />
                <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {/* Bottom Row: Keywords + Recent Reviews */}
      {analytics && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        >
          {/* Word Cloud / Top Keywords */}
          <Card>
            <CardHeader><CardTitle>Top Keywords</CardTitle></CardHeader>
            <div className="flex flex-wrap gap-2 p-2 min-h-[120px]">
              {analytics.top_words.length > 0
                ? analytics.top_words.slice(0, 30).map(({ text, value }) => {
                    const maxVal = analytics.top_words[0]?.value || 1
                    const size = Math.min(1.6, 0.75 + (value / maxVal) * 0.85)
                    const hue = (text.charCodeAt(0) * 137) % 360
                    return (
                      <span
                        key={text}
                        className="cursor-default px-1 transition-opacity hover:opacity-100"
                        style={{
                          fontSize: `${size}rem`,
                          opacity: 0.5 + size * 0.3,
                          color: `hsl(${hue}, 65%, 68%)`,
                          lineHeight: 1.4,
                        }}
                      >
                        {text}
                      </span>
                    )
                  })
                : (
                  <p className="text-slate-500 text-sm">
                    No keyword data yet. Start analyzing text!
                  </p>
                )
              }
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <div className="space-y-3">
              {analytics.recent_reviews.length === 0 ? (
                <p className="text-slate-500 text-sm">No analyses yet. Start analyzing text!</p>
              ) : (
                analytics.recent_reviews.map(review => (
                  <div
                    key={review.id}
                    className="flex items-start gap-3 p-3 bg-white/3 rounded-lg border border-white/5"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: getSentimentColor(review.sentiment) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{review.text}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`text-xs ${
                            review.sentiment === 'positive' ? 'text-emerald-400'
                            : review.sentiment === 'negative' ? 'text-red-400'
                            : 'text-gray-400'
                          }`}
                        >
                          {capitalize(review.sentiment)}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-500">{review.emotion}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-xs text-slate-500">
                          {review.created_at ? formatDate(review.created_at) : ''}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {Math.round((review.confidence || 0) * 100)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Empty state when no data */}
      {!loading && !analytics && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Activity size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No Analytics Data Yet</h2>
          <p className="text-slate-400 mb-6">
            Make sure the backend is running and start analyzing text to see your dashboard.
          </p>
          <Button onClick={fetchAnalytics} icon={<RefreshCw size={16} />}>
            Retry Connection
          </Button>
        </motion.div>
      )}
    </div>
  )
}
