import axios from 'axios'
import { SingleAnalysisResponse, BulkAnalysisResponse, AnalyticsData, HistoryRecord, URLAnalysisResponse, CorrectionEntry, CorrectionStats, User, UserReport, ReportStats } from '@/types'

const _downloadPdf = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => window.URL.revokeObjectURL(url), 100)
}

const AUTH_TOKEN_KEY = 'sentimentiq_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    let message = error.message || 'An error occurred'
    if (error.response?.data instanceof Blob && error.response.data.type === 'application/json') {
      try {
        const text = await error.response.data.text()
        message = JSON.parse(text)?.detail || message
      } catch { /* ignore parse errors */ }
    } else if (error.response?.data?.detail) {
      message = error.response.data.detail
    }
    return Promise.reject(new Error(message))
  }
)

export const analyzeText = async (text: string): Promise<SingleAnalysisResponse> => {
  const { data } = await api.post('/analyze', { text, mode: 'single' })
  return data
}

export const bulkAnalyze = async (texts: string[]): Promise<BulkAnalysisResponse> => {
  const { data } = await api.post('/bulk-analyze', { texts })
  return data
}

export const uploadCSV = async (file: File): Promise<{ texts: string[]; total: number; column_used: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const getAnalytics = async (): Promise<AnalyticsData> => {
  const { data } = await api.get('/analytics')
  return data
}

export const getHistory = async (params: {
  page?: number
  page_size?: number
  sentiment?: string
  search?: string
}) => {
  const { data } = await api.get('/history', { params })
  return data as { total: number; page: number; pages: number; items: HistoryRecord[] }
}

export const deleteHistoryRecord = async (id: string) => {
  await api.delete(`/history/${id}`)
}

export const clearHistory = async () => {
  await api.delete('/history')
}

export const analyzeURL = async (url: string, max_comments: number = 20): Promise<URLAnalysisResponse> => {
  const { data } = await api.post('/analyze-url', { url, max_comments }, { timeout: 600000 })
  return data
}

export const exportURLAnalysisPDF = async (result: URLAnalysisResponse): Promise<void> => {
  const response = await api.post('/export-pdf', result, { responseType: 'blob', timeout: 30000 })
  _downloadPdf(new Blob([response.data], { type: 'application/pdf' }),
    response.headers['content-disposition']?.split('filename=')[1] ?? 'sentiment_report.pdf')
}

export const exportSingleAnalysisPDF = async (result: SingleAnalysisResponse): Promise<void> => {
  const response = await api.post('/export-pdf/single', result, { responseType: 'blob', timeout: 30000 })
  _downloadPdf(new Blob([response.data], { type: 'application/pdf' }),
    response.headers['content-disposition']?.split('filename=')[1] ?? 'sentiment_report_single.pdf')
}

export const exportBulkAnalysisPDF = async (result: BulkAnalysisResponse): Promise<void> => {
  const response = await api.post('/export-pdf/bulk', result, { responseType: 'blob', timeout: 30000 })
  _downloadPdf(new Blob([response.data], { type: 'application/pdf' }),
    response.headers['content-disposition']?.split('filename=')[1] ?? 'sentiment_report_bulk.pdf')
}

export const addCorrection = async (data: {
  text: string
  correct_label: string
  model_label?: string
  keywords?: string[]
}): Promise<CorrectionEntry> => {
  const { data: res } = await api.post('/corrections', data)
  return res
}

export const getCorrections = async (limit = 50): Promise<CorrectionEntry[]> => {
  const { data } = await api.get('/corrections', { params: { limit } })
  return data
}

export const getCorrectionStats = async (): Promise<CorrectionStats> => {
  const { data } = await api.get('/corrections/stats')
  return data
}

export const retrainModel = async (): Promise<{ status: string; corrections_used: number }> => {
  const { data } = await api.post('/corrections/retrain')
  return data
}

export const deleteCorrection = async (id: string): Promise<void> => {
  await api.delete(`/corrections/${id}`)
}

export const getOnlineStatus = async (): Promise<{ loaded: boolean; sample_count: number }> => {
  const { data } = await api.get('/corrections/online-status')
  return data
}

export const fetchOnlineDataset = async (samplesPerClass = 150): Promise<{
  status: string
  tweet_eval: number
  multilingual: number
  total_online: number
  total_training: number
}> => {
  const { data } = await api.post(
    `/corrections/fetch-online?samples_per_class=${samplesPerClass}`,
    {},
    { timeout: 300000 }  // 5 min — first download can be slow
  )
  return data
}

export const checkHealth = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '')
  const { data } = await axios.get(`${baseUrl}/health`)
  return data
}

// Auth
export const loginUser = async (username: string, password: string): Promise<{ access_token: string; user: User }> => {
  const { data } = await api.post('/auth/login', { username, password })
  return data
}

export const registerUser = async (username: string, password: string, email?: string): Promise<{ access_token: string; user: User }> => {
  const { data } = await api.post('/auth/register', { username, password, email })
  return data
}

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get('/auth/me')
  return data
}

// Reports (user side)
export const submitReport = async (payload: {
  text: string
  model_label?: string
  user_note?: string
}): Promise<UserReport> => {
  const { data } = await api.post('/reports', payload)
  return data
}

// Reports (admin side)
export const getReports = async (status?: string, limit = 50): Promise<UserReport[]> => {
  const { data } = await api.get('/reports', { params: { status, limit } })
  return data
}

export const getReportStats = async (): Promise<ReportStats> => {
  const { data } = await api.get('/reports/stats')
  return data
}

export const reviewReport = async (
  id: string,
  payload: { status: string; correct_label?: string; keywords?: string[] }
): Promise<UserReport> => {
  const { data } = await api.patch(`/reports/${id}`, payload)
  return data
}

export const deleteReport = async (id: string): Promise<void> => {
  await api.delete(`/reports/${id}`)
}
