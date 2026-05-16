'use client';

import { useState, useEffect } from 'react';

interface SessionAgent {
  id: string;
  agent_id: string;
  turn_order: number;
  mood: string;
  agent: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
}

interface Session {
  id: string;
  name: string;
  is_active: boolean;
  hierarchy_order: string[];
  session_agents: SessionAgent[];
  created_at: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setSessions(data);
      } catch (err) {
        setError('Failed to load sessions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Sessions</h1>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            + New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No sessions yet</p>
            <p className="text-gray-500 text-sm">Create a session to start chatting with Emma, Poppy, and Celeste!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{session.name}</h3>
                    <p className="text-sm text-gray-400">
                      {session.session_agents?.length || 0} agents • Created {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex -space-x-2">
                    {session.session_agents?.slice(0, 3).map((sa) => (
                      <div
                        key={sa.id}
                        className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium border-2 border-gray-800"
                        title={sa.agent?.name}
                      >
                        {sa.agent?.name?.[0] || '?'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}