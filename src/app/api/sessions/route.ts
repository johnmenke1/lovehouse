import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/sessions - List all sessions
export async function GET() {
  try {
    const result = await query(
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
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error in GET /api/sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/sessions - Create new session
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, agentIds } = body;

    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json({ error: 'At least one agent is required' }, { status: 400 });
    }

    // Create session
    // Build hierarchy_order as array of UUIDs
    const hierarchyOrder = agentIds.map((id: string) => id);
    const sessionResult = await query(
      `INSERT INTO sessions (name, hierarchy_order)
       VALUES ($1, $2)
       RETURNING *`,
      [name || 'New Session', hierarchyOrder]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Failed to create session');
    }

    const session = sessionResult.rows[0] as { id: string; name: string; hierarchy_order: string[]; is_active: boolean; created_at: Date; updated_at: Date };

    // Add agents to session
    for (let i = 0; i < agentIds.length; i++) {
      await query(
        `INSERT INTO session_agents (session_id, agent_id, turn_order, mood)
         VALUES ($1, $2, $3, $4)`,
        [session.id, agentIds[i], i, 'neutral']
      );
    }

    // Fetch complete session with agents
    const completeResult = await query(
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
      [session.id]
    );

    return NextResponse.json(completeResult.rows[0] || session);
  } catch (error) {
    console.error('Error in POST /api/sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}