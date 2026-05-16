'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface InputBarProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function InputBar({ onSend, disabled, placeholder }: InputBarProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-gray-700">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={disabled}
        placeholder={placeholder || "Type a message..."}
        className={cn(
          'flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg',
          'text-white placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      />
      <Button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-6"
      >
        Send
      </Button>
    </form>
  );
}