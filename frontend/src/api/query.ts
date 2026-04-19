import { useAuthStore } from '../store/authStore';
import { StreamEvent, DebugResult } from '../types';

/**
 * CodeRAG Query API
 * 
 * Logic merged from modern Stitch architecture into current backend constraints.
 */

export type QueryStatus = 'retrieving' | 'retrieved' | 'analyzing' | 'complete' | 'error';

export interface QueryEvent {
  status: QueryStatus;
  payload?: {
    text?: string;
    result?: DebugResult;
  };
  message?: string;
  timestamp: string;
}

export interface StreamQueryOptions {
  query: string;
  repo_id: string;
  onEvent: (event: QueryEvent) => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
}

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * streamQuery
 * Bridges the existing Python backend (POST /query) with modern SSE processing.
 */
export const streamQuery = async ({
  query,
  repo_id,
  onEvent,
  onError,
  signal,
}: StreamQueryOptions): Promise<void> => {
  const { accessToken } = useAuthStore.getState();

  try {
    // Backend expects POST /query with QueryRequest body
    const response = await fetch(`${baseURL}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, repo_id }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Query failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null, streaming not supported.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split by lines (SSE data pattern)
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Backend sends "data: {...}"
        if (trimmedLine.startsWith('data: ')) {
          const jsonString = trimmedLine.replace('data: ', '');
          
          try {
            const rawEvent: StreamEvent = JSON.parse(jsonString);
            
            // Map backend StreamEvent to frontend QueryEvent
            onEvent({
              status: rawEvent.status as QueryStatus,
              payload: {
                text: rawEvent.message, // Map message to text chunk
                result: rawEvent.result
              },
              timestamp: new Date().toISOString()
            });

            if (rawEvent.status === 'error') {
              throw new Error(rawEvent.message || 'Stream encountered an error');
            }
          } catch (parseError) {
            console.error('Failed to parse backend event:', parseError, jsonString);
          }
        }
      }
    }
    
    // Finalize
    onEvent({ status: 'complete', timestamp: new Date().toISOString() });

  } catch (error: any) {
    if (error.name === 'AbortError') return;
    
    if (onError) {
      onError(error);
    } else {
      onEvent({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
};
export const getAvailableRepos = async (): Promise<string[]> => {
  const { accessToken } = useAuthStore.getState();
  
  const response = await fetch(`${baseURL}/repos`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }

  const data = await response.json();
  return data.repos;
};
export const ingestRepo = async (github_url: string, repo_id: string): Promise<any> => {
  const { accessToken } = useAuthStore.getState();
  
  const response = await fetch(`${baseURL}/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_url, repo_id }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ingestion failed');
  }

  return response.json();
};
