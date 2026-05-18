import axios from 'axios'
import { SingleAnalysisResponse, BulkAnalysisResponse, AnalyticsData, HistoryRecord, URLAnalysisResponse } from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred'
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

export const checkHealth = async () => {
  const { data } = await axios.get('http://localhost:8000/health')
  return data
}
