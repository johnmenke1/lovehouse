'use client';

import { useQuery } from '@tanstack/react-query';
import type { Session, SessionAgent } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface SessionCardProps {
  session: Session;
  onSelect: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

export function SessionCard({ session, onSelect, onDelete }: SessionCardProps) {
  return (
    <div
      className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors cursor-pointer"
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">{session.name || 'Untitled Session'}</h3>
          <p className="text-sm text-gray-400 mt-1">
            {session.agents?.length || 0} agents • Created {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
          >
            ✕
          </Button>
        )}
      </div>
      {session.agents && session.agents.length > 0 && (
        <div className="flex gap-1 mt-3">
          {session.agents.slice(0, 4).map((agent) => (
            <div
              key={agent.id}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold"
              title={agent.name}
            >
              {agent.name.charAt(0)}
            </div>
          ))}
          {session.agents.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs">
              +{session.agents.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

export function SessionList({ onSelectSession }: SessionListProps) {
  const { data: sessions, isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await fetch('/api/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="w-8 h-8 text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-400">
        Failed to load sessions
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions?.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No sessions yet</p>
      ) : (
        sessions?.map((session: Session) => (
          <SessionCard
            key={session.id}
            session={session}
            onSelect={onSelectSession}
          />
        ))
      )}
    </div>
  );
}