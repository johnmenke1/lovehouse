'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import type { SessionAgent } from '@/types';
import { MOODS, MOOD_DESCRIPTIONS, type Mood } from '@/types';

interface AgentMoodPickerProps {
  sessionId: string;
  sessionAgent: SessionAgent;
}

export function AgentMoodPicker({ sessionId, sessionAgent }: AgentMoodPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const updateMood = useMutation({
    mutationFn: async (mood: string) => {
      const res = await fetch(
        `/api/sessions/${sessionId}/agents/${sessionAgent.id}/mood`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mood }),
        }
      );
      if (!res.ok) throw new Error('Failed to update mood');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      setIsOpen(false);
    },
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-full text-sm transition-colors"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: sessionAgent.mood ? getMoodColor(sessionAgent.mood) : '#9ca3af',
          }}
        />
        <span className="text-gray-200">
          {sessionAgent.mood || 'neutral'}
        </span>
        <span className="text-gray-400">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 z-20 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
            {MOODS.map((mood) => (
              <button
                key={mood}
                onClick={() => updateMood.mutate(mood)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-3"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getMoodColor(mood) }}
                />
                <span className="text-gray-200 capitalize">{mood}</span>
              </button>
            ))}
          </div>
        </>
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