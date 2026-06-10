import axios from 'axios'
import { SingleAnalysisResponse, BulkAnalysisResponse, AnalyticsData, HistoryRecord, URLAnalysisResponse } from '@/types'

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

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
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

export const checkHealth = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, '')
  const { data } = await axios.get(`${baseUrl}/health`)
  return data
}
