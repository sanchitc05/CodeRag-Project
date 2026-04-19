import { QueryStatus } from '../api/query';

/**
 * CodeRAG Frontend Types
 */

export interface User {
  user_id: number;
  email: string;
  access_token: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email: string;
}

export interface EvidenceItem {
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
  name: string;
}

export interface DebugResult {
  root_cause: string;
  suggested_fix: string;
  evidence: EvidenceItem[];
  confidence: number;
  iterations: number;
  hypothesis_chain: string[];
  session_id: number;
  intent: string;
}

export interface StreamEvent {
  status: QueryStatus;
  message?: string;
  chunks?: number;
  result?: DebugResult;
  session_id?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: QueryStatus;
  timestamp: string;
  result?: DebugResult;
}

export interface HistoryItem {
  id: number;
  query: string;
  response: DebugResult;
  created_at: string;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface IngestRequest {
  github_url: string;
  repo_id: string;
}

export interface IngestResponse {
  repo_id: string;
  total_chunks?: number;
  status: string;
  message?: string;
}
