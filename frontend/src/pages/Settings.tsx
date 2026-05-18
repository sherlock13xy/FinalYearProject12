import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Server, Cpu, Palette, Info,
  Save, RefreshCw, CheckCircle, XCircle, Wifi, Check
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { checkHealth } from '@/lib/api'
import { THEMES } from '@/lib/themes'
import { useAppStore } from '@/store'

const STORAGE_KEY = 'sentimentiq_settings'

interface AppSettings {
  apiUrl: string
  device: 'auto' | 'cpu' | 'gpu'
  maxTextLength: number
  enableAnimations: boolean
  showConfidenceDecimals: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  apiUrl: 'http://localhost:8000/api/v1',
  device: 'auto',
  maxTextLength: 5000,
  enableAnimations: true,
  showConfidenceDecimals: false,
}

const TECH_BADGES = [
  { label: 'BERT', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  { label: 'DistilBERT', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  { label: 'FastAPI', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  { label: 'React 18', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { label: 'PyTorch', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  { label: 'Transformers', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { label: 'Logistic Regression', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { label: 'LangDetect', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
]

export default function Settings() {
  const { themeId, setThemeId } = useAppStore()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [savedSettings, setSavedSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed'>('idle')
  const [saving, setSaving] = useState(false)
  const [healthData, setHealthData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>
        const merged = { ...DEFAULT_SETTINGS, ...parsed }
        setSettings(merged)
        setSavedSettings(merged)
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSavedSettings(settings)
      toast.success('Settings saved successfully!')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    toast('Settings reset to defaults', { icon: '🔄' })
  }

  const handleTestConnection = async () => {
    setConnectionStatus('checking')
    try {
      const data = await checkHealth()
      setHealthData(data)
      setConnectionStatus('connected')
      toast.success('Backend connected successfully!')
    } catch {
      setConnectionStatus('failed')
      setHealthData(null)
      toast.error('Could not connect to backend. Is it running?')
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings)

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 gradient-text">Settings</h1>
            <p className="text-slate-400">Configure your sentiment analysis platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              icon={<RefreshCw size={14} />}
            >
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              size="sm"
              icon={<Save size={16} />}
              className={hasChanges ? 'ring-2 ring-indigo-500/30' : ''}
            >
              {hasChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* API Configuration */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Server size={16} className="text-indigo-400" />
              </div>
              <CardTitle>API Configuration</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-4">
            <Input
              label="Backend API URL"
              value={settings.apiUrl}
              onChange={e => updateSetting('apiUrl', e.target.value)}
              placeholder="http://localhost:8000/api/v1"
            />

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                loading={connectionStatus === 'checking'}
                icon={<Wifi size={14} />}
              >
                Test Connection
              </Button>

              {connectionStatus === 'connected' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-emerald-400 text-sm"
                >
                  <CheckCircle size={16} />
                  <span>Connected</span>
                </motion.div>
              )}

              {connectionStatus === 'failed' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm"
                >
                  <XCircle size={16} />
                  <span>Connection failed — is the backend running?</span>
                </motion.div>
              )}
            </div>

            {/* Health data display */}
            {healthData && connectionStatus === 'connected' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4"
              >
                <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">
                  Backend Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(healthData as Record<string, string>).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                      <span className="text-emerald-300 font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Model Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Cpu size={16} className="text-violet-400" />
              </div>
              <CardTitle>Model Settings</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-5">
            <Select
              label="Inference Device"
              value={settings.device}
              onChange={e => updateSetting('device', e.target.value as AppSettings['device'])}
              options={[
                { value: 'auto', label: 'Auto (GPU if available, else CPU)' },
                { value: 'cpu', label: 'CPU Only' },
                { value: 'gpu', label: 'GPU / CUDA' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Max Text Length
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={500}
                  max={10000}
                  step={500}
                  value={settings.maxTextLength}
                  onChange={e => updateSetting('maxTextLength', parseInt(e.target.value))}
                  className="flex-1 accent-indigo-500"
                />
                <span className="text-white font-medium w-20 text-right">
                  {settings.maxTextLength.toLocaleString()} chars
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Maximum number of characters allowed per text input
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Display Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Palette size={16} className="text-cyan-400" />
              </div>
              <CardTitle>Appearance & Display</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-4">
            {/* Theme picker */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Color Theme</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEMES.map((theme) => {
                  const isActive = themeId === theme.id
                  return (
                    <motion.button
                      key={theme.id}
                      onClick={() => {
                        setThemeId(theme.id)
                        toast.success(`${theme.name} theme applied!`)
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative p-4 rounded-xl border text-left transition-all duration-200"
                      style={isActive ? {
                        background: `linear-gradient(135deg, rgba(${theme.colors.primaryRgb},0.15) 0%, rgba(${theme.colors.secondaryRgb},0.1) 100%)`,
                        borderColor: `rgba(${theme.colors.primaryRgb},0.5)`,
                        boxShadow: `0 0 20px rgba(${theme.colors.primaryRgb},0.15)`,
                      } : {
                        background: 'rgba(255,255,255,0.03)',
                        borderColor: 'rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Active check */}
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: theme.colors.primary }}
                        >
                          <Check size={11} className="text-white" />
                        </motion.div>
                      )}

                      {/* Color swatches */}
                      <div className="flex gap-1.5 mb-3">
                        {theme.preview.map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border border-white/10 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <p className="text-sm font-semibold text-white">{theme.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{theme.description}</p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Toggle: Animations */}
            <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Enable Animations</p>
                <p className="text-xs text-slate-400">Framer Motion page transitions and micro-animations</p>
              </div>
              <button
                onClick={() => updateSetting('enableAnimations', !settings.enableAnimations)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  settings.enableAnimations ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.enableAnimations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle: Confidence decimals */}
            <div className="flex items-center justify-between p-4 bg-white/3 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Show Confidence Decimals</p>
                <p className="text-xs text-slate-400">Display confidence as 87.34% instead of 87%</p>
              </div>
              <button
                onClick={() => updateSetting('showConfidenceDecimals', !settings.showConfidenceDecimals)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  settings.showConfidenceDecimals ? 'bg-indigo-600' : 'bg-white/10'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.showConfidenceDecimals ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* About */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Info size={16} className="text-amber-400" />
              </div>
              <CardTitle>About SentimentIQ</CardTitle>
            </div>
          </CardHeader>

          <div className="space-y-5">
            {/* Version info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Version', value: '1.0.0' },
                { label: 'Build', value: 'Production' },
                { label: 'Frontend', value: 'React 18 + Vite' },
                { label: 'Backend', value: 'FastAPI + Python' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/3 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                SentimentIQ is an AI-powered multilingual sentiment intelligence platform that analyzes
                customer reviews, feedback, and any text to extract sentiment, emotion, tone, and intent.
                Built with BERT-based transformers and logistic regression models, it supports English,
                Hindi, Bengali, Assamese, Hinglish, and more.
              </p>
            </div>

            {/* Tech Stack */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-3">Technology Stack</p>
              <div className="flex flex-wrap gap-2">
                {TECH_BADGES.map(({ label, color, bg }) => (
                  <span
                    key={label}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${color} ${bg}`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Model info */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-300">Models Used</p>
              {[
                {
                  name: 'Sentiment Analysis',
                  model: 'BERT / DistilBERT fine-tuned',
                  color: 'text-indigo-400',
                },
                {
                  name: 'Emotion Detection',
                  model: 'Logistic Regression (TF-IDF)',
                  color: 'text-violet-400',
                },
                {
                  name: 'Tone Analysis',
                  model: 'Logistic Regression (TF-IDF)',
                  color: 'text-cyan-400',
                },
                {
                  name: 'Intent Classification',
                  model: 'Logistic Regression (TF-IDF)',
                  color: 'text-emerald-400',
                },
                {
                  name: 'Language Detection',
                  model: 'LangDetect / FastText',
                  color: 'text-amber-400',
                },
              ].map(({ name, model, color }) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-white/3 rounded-lg border border-white/5"
                >
                  <span className="text-sm text-slate-300">{name}</span>
                  <span className={`text-xs font-medium ${color}`}>{model}</span>
                </div>
              ))}
            </div>

            {/* Supported Languages */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Supported Languages</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'English', 'Hindi', 'Bengali', 'Assamese',
                  'Hinglish', 'Tamil', 'Telugu', 'Marathi',
                  'Gujarati', 'Punjabi', '+ more'
                ].map(lang => (
                  <Badge key={lang} variant="default">{lang}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Save button at bottom */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-6 flex justify-center"
        >
          <div className="glass-card px-6 py-3 flex items-center gap-4">
            <p className="text-sm text-slate-300">You have unsaved changes</p>
            <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
              Save Settings
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
