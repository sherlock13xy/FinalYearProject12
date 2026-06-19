export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'user';
  created_at: string;
}

export interface UserReport {
  id: string;
  text: string;
  model_label: string | null;
  user_note: string | null;
  status: 'pending' | 'reviewed' | 'fixed';
  reporter_username: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface ReportStats {
  total: number;
  pending: number;
  reviewed: number;
  fixed: number;
}

export interface SentimentResult {
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
  probabilities: { positive: number; negative: number; neutral: number };
}

export interface SarcasmResult {
  detected: boolean;
  confidence: number;
}

export interface EmotionResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface ToneResult {
  label: string;
  intensity: number;
  scores: Record<string, number>;
}

export interface IntentResult {
  label: string;
  confidence: number;
  scores: Record<string, number>;
}

export interface SingleAnalysisResponse {
  id: string;
  original_text: string;
  detected_language: string;
  language_code: string;
  translated_text: string;
  is_translation: boolean;
  sentiment: SentimentResult;
  sarcasm: SarcasmResult;
  emotion: EmotionResult;
  tone: ToneResult;
  intent: IntentResult;
  interpretation: string;
  suggested_response: string;
  processing_time: number;
  timestamp: string;
  word_count: number;
  char_count: number;
}

export interface BulkAnalysisItem {
  row_number: number;
  original_text: string;
  detected_language: string;
  translated_text: string;
  sentiment: SentimentResult;
  sarcasm?: SarcasmResult;
  emotion: EmotionResult;
  tone: ToneResult;
  intent: IntentResult;
  interpretation: string;
  suggested_response: string;
  processing_time: number;
}

export interface BulkAnalysisResponse {
  total: number;
  items: BulkAnalysisItem[];
  aggregate: {
    sentiment_distribution: Record<string, number>;
    emotion_distribution: Record<string, number>;
    tone_distribution: Record<string, number>;
    intent_distribution: Record<string, number>;
    dominant_sentiment: string;
    dominant_emotion: string;
    dominant_tone: string;
    dominant_intent: string;
    average_confidence: number;
  };
  processing_time: number;
}

export interface AnalyticsData {
  total_analyzed: number;
  sentiment_distribution: Record<string, number>;
  emotion_distribution: Record<string, number>;
  tone_distribution: Record<string, number>;
  intent_distribution: Record<string, number>;
  language_distribution: Record<string, number>;
  average_confidence: number;
  trend_data: Array<{ date: string; positive: number; negative: number; neutral: number; total: number }>;
  top_words: Array<{ text: string; value: number }>;
  recent_reviews: Array<{
    id: string;
    text: string;
    sentiment: string;
    emotion: string;
    confidence: number;
    created_at: string;
  }>;
  ai_insight: string;
  dominant_sentiment: string;
  dominant_emotion: string;
  dominant_tone: string;
  dominant_intent: string;
}

export interface PostMetadata {
  platform: 'youtube' | 'myntra';
  title: string;
  author: string;
  url: string;
  fetched_comments: number;
  total_available: number;
}

export interface URLAnalysisResponse {
  post: PostMetadata;
  total: number;
  items: BulkAnalysisItem[];
  aggregate: BulkAnalysisResponse['aggregate'];
  processing_time: number;
}

export interface AdminUserEntry {
  id: string
  username: string
  email: string | null
  role: 'admin' | 'user'
  is_active: boolean
  created_at: string | null
}

export interface AdminStats {
  users: {
    total: number
    admins: number
    regular_users: number
    list: AdminUserEntry[]
  }
  storage: {
    db_size_bytes: number
    db_size_mb: number
    limit_mb: number
    usage_pct: number
    analysis_records: number
    correction_entries: number
    user_reports: number
    total_records: number
  }
}

export interface CorrectionEntry {
  id: string;
  text: string;
  correct_label: 'positive' | 'negative' | 'neutral';
  model_label: string | null;
  keywords: string[];
  created_at: string;
}

export interface CorrectionStats {
  total: number;
  retrain_threshold: number;
  needs_retrain: boolean;
  label_breakdown: Record<string, number>;
  top_keywords: Array<{ word: string; count: number }>;
  last_retrain: string | null;
}

export interface HistoryRecord {
  id: string;
  original_text: string;
  detected_language: string;
  translated_text: string;
  sentiment: SentimentResult;
  emotion: EmotionResult;
  tone: ToneResult;
  intent: IntentResult;
  interpretation: string;
  suggested_response: string;
  processing_time: number;
  mode: string;
  created_at: string;
}
