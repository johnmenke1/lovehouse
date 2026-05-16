'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isAgent = message.senderType === 'agent';

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg',
        isOwn ? 'bg-gray-800' : 'bg-gray-700'
      )}
    >
      {!isOwn && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {message.senderName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            'font-semibold',
            isOwn ? 'text-blue-400' : 'text-gray-200'
          )}>
            {message.senderName}
          </span>
          <span className="text-xs text-gray-400">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>
        <p className="text-gray-100 whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
      {isOwn && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold">
          J
        </div>
      )}
    </div>
  );
}