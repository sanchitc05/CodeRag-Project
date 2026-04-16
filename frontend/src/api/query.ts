import client from './client';
import { IngestResponse, StreamEvent } from '../types';
import { useAuthStore } from '../store/authStore';

export async function ingestRepo(
  github_url: string,
  repo_id: string
): Promise<IngestResponse> {
  const response = await client.post<IngestResponse>('/ingest', {
    github_url,
    repo_id,
  });
  return response.data;
}

export async function getAvailableRepos(): Promise<string[]> {
  const response = await client.get<{ repos: string[] }>('/repos');
  return response.data.repos || [];
}

export async function streamQuery(
  query: string,
  repo_id: string,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const token = useAuthStore.getState().user?.access_token;
  const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const response = await fetch(`${baseUrl}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, repo_id }),
  });

  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));
          onEvent(event);
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}
