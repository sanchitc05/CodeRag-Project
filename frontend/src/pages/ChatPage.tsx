import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { AppLayout } from '../components/layout/AppLayout';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatInput } from '../components/chat/ChatInput';
import { useStream } from '../hooks/useStream';
import { getSession } from '../api/history';
import { getAvailableRepos } from '../api/query';
import { Message } from '../types';

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const { streamingStatus, isStreaming, result, error, sendQuery, reset } =
    useStream();

  // Load repositories from the backend so the chat only uses repos that exist.
  useEffect(() => {
    const loadRepos = async () => {
      try {
        const backendRepos = await getAvailableRepos();
        setAvailableRepos(backendRepos);
        localStorage.setItem('coderag_repos', JSON.stringify(backendRepos));
      } catch {
        const stored = localStorage.getItem('coderag_repos');
        const repos = stored ? JSON.parse(stored) : [];
        setAvailableRepos(repos);
      }
    };

    loadRepos();
  }, []);

  // Load session if URL param exists
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId) {
      const loadSession = async () => {
        try {
          const session = await getSession(parseInt(sessionId));
          setMessages([
            {
              id: uuidv4(),
              role: 'user',
              content: session.query,
              timestamp: new Date(session.created_at),
            },
            {
              id: uuidv4(),
              role: 'assistant',
              content: session.response.root_cause || 'Debug result',
              result: session.response,
              timestamp: new Date(session.created_at),
            },
          ]);
        } catch (err) {
          toast.error('Failed to load session');
        }
      };
      loadSession();
    }
  }, [searchParams]);

  const handleSendQuery = async (query: string, repoId: string) => {
    // Add user message
    const userMessageId = uuidv4();
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder for assistant response
    const assistantMessageId = uuidv4();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: streamingStatus || 'Processing...',
        isStreaming: true,
        timestamp: new Date(),
      },
    ]);

    try {
      const finalResult = await sendQuery(query, repoId);

      // Update the assistant message with the final stream result.
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: finalResult.root_cause || 'Debug complete',
                result: finalResult,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      toast.error(message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'Query failed. Please try again.',
                isStreaming: false,
              }
            : msg
        )
      );
    }

    reset();
  };

  return (
    <AppLayout title="Chat">
      <div className="flex flex-col h-full">
        <ChatWindow messages={messages} />
        <ChatInput
          onSendQuery={handleSendQuery}
          isLoading={isStreaming}
          availableRepos={availableRepos}
        />
      </div>
    </AppLayout>
  );
}
