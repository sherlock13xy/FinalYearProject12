export interface Theme {
  id: string
  name: string
  description: string
  preview: string[]   // 4 hex swatches shown in the picker
  colors: {
    primary: string
    primaryRgb: string
    secondary: string
    secondaryRgb: string
    accent: string
    accentRgb: string
    // aurora blob colors
    blob1: string
    blob2: string
    blob3: string
    blob4: string
  }
}

export const THEMES: Theme[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Indigo · Violet · Cyan',
    preview: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
    colors: {
      primary:      '#6366f1',
      primaryRgb:   '99, 102, 241',
      secondary:    '#8b5cf6',
      secondaryRgb: '139, 92, 246',
      accent:       '#06b6d4',
      accentRgb:    '6, 182, 212',
      blob1: '#6366f1',
      blob2: '#8b5cf6',
      blob3: '#06b6d4',
      blob4: '#10b981',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Blue · Cyan · Teal',
    preview: ['#3b82f6', '#06b6d4', '#14b8a6', '#0ea5e9'],
    colors: {
      primary:      '#3b82f6',
      primaryRgb:   '59, 130, 246',
      secondary:    '#06b6d4',
      secondaryRgb: '6, 182, 212',
      accent:       '#14b8a6',
      accentRgb:    '20, 184, 166',
      blob1: '#3b82f6',
      blob2: '#06b6d4',
      blob3: '#14b8a6',
      blob4: '#0ea5e9',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Rose · Pink · Purple',
    preview: ['#f43f5e', '#ec4899', '#a855f7', '#fb923c'],
    colors: {
      primary:      '#f43f5e',
      primaryRgb:   '244, 63, 94',
      secondary:    '#ec4899',
      secondaryRgb: '236, 72, 153',
      accent:       '#a855f7',
      accentRgb:    '168, 85, 247',
      blob1: '#f43f5e',
      blob2: '#ec4899',
      blob3: '#a855f7',
      blob4: '#fb923c',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Emerald · Teal · Green',
    preview: ['#10b981', '#14b8a6', '#22c55e', '#06b6d4'],
    colors: {
      primary:      '#10b981',
      primaryRgb:   '16, 185, 129',
      secondary:    '#14b8a6',
      secondaryRgb: '20, 184, 166',
      accent:       '#22c55e',
      accentRgb:    '34, 197, 94',
      blob1: '#10b981',
      blob2: '#14b8a6',
      blob3: '#22c55e',
      blob4: '#06b6d4',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Amber · Orange · Gold',
    preview: ['#f59e0b', '#f97316', '#eab308', '#ef4444'],
    colors: {
      primary:      '#f59e0b',
      primaryRgb:   '245, 158, 11',
      secondary:    '#f97316',
      secondaryRgb: '249, 115, 22',
      accent:       '#eab308',
      accentRgb:    '234, 179, 8',
      blob1: '#f59e0b',
      blob2: '#f97316',
      blob3: '#eab308',
      blob4: '#ef4444',
    },
  },
]

export const DEFAULT_THEME_ID = 'aurora'

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0]
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const c = theme.colors
  root.style.setProperty('--primary',       c.primary)
  root.style.setProperty('--primary-rgb',   c.primaryRgb)
  root.style.setProperty('--secondary',     c.secondary)
  root.style.setProperty('--secondary-rgb', c.secondaryRgb)
  root.style.setProperty('--accent',        c.accent)
  root.style.setProperty('--accent-rgb',    c.accentRgb)
  root.style.setProperty('--blob-1',        c.blob1)
  root.style.setProperty('--blob-2',        c.blob2)
  root.style.setProperty('--blob-3',        c.blob3)
  root.style.setProperty('--blob-4',        c.blob4)
}
