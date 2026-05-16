import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// GET /api/sessions/[sessionId]
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

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
       WHERE s.id = $1
       GROUP BY s.id`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error in GET /api/sessions/[sessionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/sessions/[sessionId]
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    await query('DELETE FROM sessions WHERE id = $1', [sessionId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/sessions/[sessionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}