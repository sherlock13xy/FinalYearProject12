import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SingleAnalysis from './pages/SingleAnalysis'
import BulkAnalysis from './pages/BulkAnalysis'
import URLAnalysis from './pages/URLAnalysis'
import History from './pages/History'
import Settings from './pages/Settings'
import Login from './pages/Login'
import TrainingData from './pages/TrainingData'
import UserReports from './pages/UserReports'
import { useAppStore } from '@/store'
import { getTheme, applyTheme } from '@/lib/themes'

function ThemeApplier() {
  const themeId = useAppStore(s => s.themeId)
  useEffect(() => { applyTheme(getTheme(themeId)) }, [themeId])
  useEffect(() => { applyTheme(getTheme(themeId)) }, [])
  return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAppStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeApplier />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analyze" element={<SingleAnalysis />} />
          <Route path="bulk" element={<BulkAnalysis />} />
          <Route path="url-analysis" element={<URLAnalysis />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="training-data" element={<TrainingData />} />
          <Route path="user-reports" element={<UserReports />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
