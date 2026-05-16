'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  agentName: string;
}

export function TypingIndicator({ agentName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <div className="flex gap-1">
        <span
          className={cn(
            'w-2 h-2 bg-gray-500 rounded-full animate-bounce',
            '[animation-delay:0ms]'
          )}
        />
        <span
          className={cn(
            'w-2 h-2 bg-gray-500 rounded-full animate-bounce',
            '[animation-delay:150ms]'
          )}
        />
        <span
          className={cn(
            'w-2 h-2 bg-gray-500 rounded-full animate-bounce',
            '[animation-delay:300ms]'
          )}
        />
      </div>
      <span className="text-sm">{agentName} is typing...</span>
    </div>
  );
}