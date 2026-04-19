import { useState, useCallback } from 'react';
import { streamQuery, QueryStatus, QueryEvent } from '../api/query';
import { Message } from '../types';

/**
 * useStream Hook
 * 
 * Manages the AI Debugger query state and streaming accumulation.
 */


export const useStream = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<QueryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string, repoId: string) => {
    setError(null);
    setIsStreaming(true);
    setCurrentStatus('retrieving');

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: 'retrieving',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      await streamQuery({
        query,
        repo_id: repoId,
        onEvent: (event: QueryEvent) => {
          if (event.status) setCurrentStatus(event.status);
          
          setMessages((prev) => 
            prev.map((msg) => {
              if (msg.id === assistantMessageId) {
                return {
                  ...msg,
                  status: event.status || msg.status,
                  // Accumulate text if provided
                  content: event.payload?.text 
                    ? msg.content + event.payload.text 
                    : msg.content,
                  // Attach result if final
                  result: event.payload?.result || msg.result,
                };
              }
              return msg;
            })
          );

          if (event.status === 'complete') {
            setIsStreaming(false);
          }
        },
        onError: (err) => {
          setError(err.message);
          setIsStreaming(false);
          setCurrentStatus('error');
          
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === assistantMessageId ? { ...msg, status: 'error' } : msg
            )
          );
        },
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsStreaming(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentStatus(null);
  }, []);

  return {
    messages,
    isStreaming,
    currentStatus,
    error,
    sendMessage,
    clearMessages,
    setMessages,
  };
};
