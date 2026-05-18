import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SingleAnalysis from './pages/SingleAnalysis'
import BulkAnalysis from './pages/BulkAnalysis'
import URLAnalysis from './pages/URLAnalysis'
import History from './pages/History'
import Settings from './pages/Settings'
import { useAppStore } from '@/store'
import { getTheme, applyTheme } from '@/lib/themes'

function ThemeApplier() {
  const themeId = useAppStore(s => s.themeId)
  useEffect(() => {
    applyTheme(getTheme(themeId))
  }, [themeId])
  // Apply once on mount from localStorage (before first render paints)
  useEffect(() => {
    applyTheme(getTheme(themeId))
  }, [])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analyze" element={<SingleAnalysis />} />
          <Route path="bulk" element={<BulkAnalysis />} />
          <Route path="url-analysis" element={<URLAnalysis />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
