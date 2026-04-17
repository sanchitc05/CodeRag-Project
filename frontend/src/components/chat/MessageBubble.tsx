import { Message } from '../../types';
import { DebugReport } from './DebugReport';
import { StreamingStatus } from './StreamingStatus';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in`}>
      <div
        className={`max-w-[85%] sm:max-w-2xl rounded-2xl p-4 shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none shadow-md'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}

        {isUser === false && (
          <>
            {message.isStreaming ? (
              <StreamingStatus message="Processing..." />
            ) : message.result ? (
              <DebugReport result={message.result} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
