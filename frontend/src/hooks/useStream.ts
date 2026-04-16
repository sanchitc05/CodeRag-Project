import { useState } from 'react';
import { streamQuery } from '../api/query';
import { DebugResult } from '../types';

interface UseStreamReturn {
  streamingStatus: string | null;
  isStreaming: boolean;
  result: DebugResult | null;
  error: string | null;
  sendQuery: (query: string, repoId: string) => Promise<DebugResult>;
  reset: () => void;
}

export function useStream(): UseStreamReturn {
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendQuery = async (query: string, repoId: string): Promise<DebugResult> => {
    setIsStreaming(true);
    setStreamingStatus(null);
    setResult(null);
    setError(null);
    let finalResult: DebugResult | null = null;
    let streamError: string | null = null;

    try {
      await streamQuery(query, repoId, (event) => {
        if (event.status === 'retrieving') {
          setStreamingStatus('Fetching relevant code...');
        } else if (event.status === 'retrieved') {
          const chunks = event.chunks || 0;
          setStreamingStatus(
            `Found ${chunks} code chunk${chunks !== 1 ? 's' : ''}. Analyzing...`
          );
        } else if (event.status === 'analyzing') {
          setStreamingStatus('Running reasoning agent...');
        } else if (event.status === 'complete') {
          finalResult = event.result || null;
          setResult(finalResult);
          setIsStreaming(false);
          setStreamingStatus(null);
        } else if (event.status === 'error') {
          streamError = event.message || 'An error occurred';
          setError(streamError);
          setIsStreaming(false);
          setStreamingStatus(null);
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsStreaming(false);
      setStreamingStatus(null);
      throw new Error(message);
    }

    if (streamError) {
      throw new Error(streamError);
    }

    if (!finalResult) {
      setIsStreaming(false);
      setStreamingStatus(null);
      throw new Error('No final result received from stream');
    }

    return finalResult;
  };

  const reset = () => {
    setStreamingStatus(null);
    setIsStreaming(false);
    setResult(null);
    setError(null);
  };

  return {
    streamingStatus,
    isStreaming,
    result,
    error,
    sendQuery,
    reset,
  };
}
