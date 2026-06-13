import { create } from 'zustand'
import { SingleAnalysisResponse, BulkAnalysisResponse, AnalyticsData, URLAnalysisResponse, User } from '@/types'
import { DEFAULT_THEME_ID } from '@/lib/themes'

const THEME_STORAGE_KEY = 'sentimentiq_theme'
const AUTH_TOKEN_KEY = 'sentimentiq_token'
const AUTH_USER_KEY = 'sentimentiq_user'

interface CorrectionPanelPrefill {
  text: string
  modelLabel: string
}

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
  correctionPanelOpen: boolean
  correctionPanelPrefill: CorrectionPanelPrefill | null
  correctionPanelSection: 'training' | 'reports'
  // auth
  user: User | null
  token: string | null
  pendingReportCount: number
  setPendingReportCount: (n: number) => void
  setLastAnalysis: (result: SingleAnalysisResponse | null) => void
  setLastBulkAnalysis: (result: BulkAnalysisResponse | null) => void
  setLastURLAnalysis: (result: URLAnalysisResponse | null) => void
  setAnalytics: (data: AnalyticsData | null) => void
  setIsAnalyzing: (val: boolean) => void
  setIsBulkAnalyzing: (val: boolean) => void
  setIsURLAnalyzing: (val: boolean) => void
  toggleSidebar: () => void
  setThemeId: (id: string) => void
  openCorrectionPanel: (prefill?: CorrectionPanelPrefill, section?: 'training' | 'reports') => void
  closeCorrectionPanel: () => void
  loginUser: (token: string, user: User) => void
  logoutUser: () => void
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID

const _savedToken = localStorage.getItem(AUTH_TOKEN_KEY)
const _savedUser = (() => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
})()

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
  correctionPanelOpen: false,
  correctionPanelPrefill: null,
  correctionPanelSection: 'training' as const,
  user: _savedUser,
  token: _savedToken,
  pendingReportCount: 0,
  setPendingReportCount: (n) => set({ pendingReportCount: n }),
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
  openCorrectionPanel: (prefill, section = 'training') => set({ correctionPanelOpen: true, correctionPanelPrefill: prefill ?? null, correctionPanelSection: section }),
  closeCorrectionPanel: () => set({ correctionPanelOpen: false, correctionPanelPrefill: null }),
  loginUser: (token, user) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
    set({ token, user })
  },
  logoutUser: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    set({ token: null, user: null })
  },
}))
