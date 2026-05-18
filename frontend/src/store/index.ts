import { create } from 'zustand'
import { SingleAnalysisResponse, BulkAnalysisResponse, AnalyticsData, URLAnalysisResponse } from '@/types'
import { DEFAULT_THEME_ID } from '@/lib/themes'

const THEME_STORAGE_KEY = 'sentimentiq_theme'

interface AppState {
  lastAnalysis: SingleAnalysisResponse | null
  lastBulkAnalysis: BulkAnalysisResponse | null
  lastURLAnalysis: URLAnalysisResponse | null
  analytics: AnalyticsData | null
  isAnalyzing: boolean
  isBulkAnalyzing: boolean
  isURLAnalyzing: boolean
  sidebarCollapsed: boolean
  themeId: string
  setLastAnalysis: (result: SingleAnalysisResponse | null) => void
  setLastBulkAnalysis: (result: BulkAnalysisResponse | null) => void
  setLastURLAnalysis: (result: URLAnalysisResponse | null) => void
  setAnalytics: (data: AnalyticsData | null) => void
  setIsAnalyzing: (val: boolean) => void
  setIsBulkAnalyzing: (val: boolean) => void
  setIsURLAnalyzing: (val: boolean) => void
  toggleSidebar: () => void
  setThemeId: (id: string) => void
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID

export const useAppStore = create<AppState>((set) => ({
  lastAnalysis: null,
  lastBulkAnalysis: null,
  lastURLAnalysis: null,
  analytics: null,
  isAnalyzing: false,
  isBulkAnalyzing: false,
  isURLAnalyzing: false,
  sidebarCollapsed: false,
  themeId: savedTheme,
  setLastAnalysis:    (result) => set({ lastAnalysis: result }),
  setLastBulkAnalysis:(result) => set({ lastBulkAnalysis: result }),
  setLastURLAnalysis: (result) => set({ lastURLAnalysis: result }),
  setAnalytics:       (data)   => set({ analytics: data }),
  setIsAnalyzing:     (val)    => set({ isAnalyzing: val }),
  setIsBulkAnalyzing: (val)    => set({ isBulkAnalyzing: val }),
  setIsURLAnalyzing:  (val)    => set({ isURLAnalyzing: val }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setThemeId: (id) => {
    localStorage.setItem(THEME_STORAGE_KEY, id)
    set({ themeId: id })
  },
}))
