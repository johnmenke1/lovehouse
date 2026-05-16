import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// GET /api/sessions/[sessionId]/messages
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;

    const result = await query(
      `SELECT * FROM messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error in GET /api/sessions/[sessionId]/messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST /api/sessions/[sessionId]/messages
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { content, senderType, senderId, senderName } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO messages (session_id, content, sender_type, sender_id, sender_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sessionId, content.trim(), senderType || 'human', senderId || null, senderName || (senderType === 'human' ? 'John' : 'Unknown')]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error in POST /api/sessions/[sessionId]/messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}