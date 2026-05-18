import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return '#10b981'
    case 'negative': return '#ef4444'
    default: return '#6b7280'
  }
}

export function getSentimentBg(sentiment: string): string {
  switch (sentiment?.toLowerCase()) {
    case 'positive': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'negative': return 'bg-red-500/20 text-red-400 border-red-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

export function getEmotionColor(emotion: string): string {
  const map: Record<string, string> = {
    'joy': '#10b981',
    'Joy': '#10b981',
    'excitement': '#f59e0b',
    'Excitement': '#f59e0b',
    'anger': '#ef4444',
    'Anger': '#ef4444',
    'frustration': '#f97316',
    'Frustration': '#f97316',
    'disappointment': '#6366f1',
    'Disappointment': '#6366f1',
    'sadness': '#3b82f6',
    'Sadness': '#3b82f6',
    'fear': '#8b5cf6',
    'Fear': '#8b5cf6',
    'disgust': '#ec4899',
    'Disgust': '#ec4899',
    'appreciation': '#06b6d4',
    'Appreciation': '#06b6d4',
    'neutral': '#6b7280',
    'Neutral': '#6b7280',
    'surprise': '#f59e0b',
    'Surprise': '#f59e0b',
  }
  return map[emotion] || '#6b7280'
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
