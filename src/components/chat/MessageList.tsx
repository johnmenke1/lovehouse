'use client';

import type { Message } from '@/types';
import { MessageBubble } from './MessageBubble';
import { useRef, useEffect } from 'react';

interface MessageListProps {
  messages: Message[];
  currentUserId?: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderType === 'human'}
        />
      ))}
    </div>
  );
}