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
  platform: 'youtube' | 'reddit';
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
