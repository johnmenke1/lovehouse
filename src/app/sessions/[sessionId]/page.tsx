import { notFound } from 'next/navigation';
import { query } from '@/lib/db';
import type { Session } from '@/types';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function SessionChatPage({ params }: PageProps) {
  const { sessionId } = await params;

  // Fetch session with agents using raw SQL
  const sessionResult = await query(
    `SELECT s.*, 
      COALESCE(
        json_agg(
          json_build_object(
            'id', sa.id,
            'agent_id', sa.agent_id,
            'turn_order', sa.turn_order,
            'mood', sa.mood,
            'agent', json_build_object('id', a.id, 'name', a.name, 'avatar_url', a.avatar_url)
          )
        ) FILTER (WHERE sa.id IS NOT NULL),
        '[]'
      ) as session_agents
     FROM sessions s
     LEFT JOIN session_agents sa ON sa.session_id = s.id
     LEFT JOIN agents a ON a.id = sa.agent_id
     WHERE s.id = $1
     GROUP BY s.id`,
    [sessionId]
  );

  const session = sessionResult.rows[0] as Record<string, unknown> | undefined;

  if (!session) {
    notFound();
  }

  const sessionName = (session?.name as string) || 'Unnamed Session';

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-white mb-4">{sessionName}</h1>
        <p className="text-gray-400">Session ID: {sessionId}</p>
        {/* Chat interface would go here */}
      </div>
    </div>
  );
}