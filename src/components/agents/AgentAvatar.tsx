'use client';

import { cn } from '@/lib/utils';

interface AgentAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showMoodBadge?: boolean;
  mood?: string | null;
}

export function AgentAvatar({ name, avatarUrl, size = 'md', showMoodBadge, mood }: AgentAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  return (
    <div className="relative">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeClasses[size]
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold',
            sizeClasses[size]
          )}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {showMoodBadge && mood && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-gray-900',
            size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
          )}
          style={{ backgroundColor: getMoodColor(mood) }}
        />
      )}
    </div>
  );
}

function getMoodColor(mood: string): string {
  const colors: Record<string, string> = {
    neutral: '#9ca3af',
    jealous: '#ef4444',
    playful: '#f59e0b',
    submissive: '#8b5cf6',
    hungry: '#22c55e',
    tired: '#6b7280',
    horny: '#ec4899',
    happy: '#10b981',
    sad: '#3b82f6',
    angry: '#dc2626',
  };
  return colors[mood] || '#9ca3af';
}