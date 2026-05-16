import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/sessions/[sessionId]/messages - Get messages for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const result = await query(
      `SELECT id, session_id as "sessionId", sender_type as "senderType", 
              sender_id as "senderId", sender_name as "senderName", 
              content, created_at as "createdAt"
       FROM messages 
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

// POST /api/sessions/[sessionId]/messages - Send a message and get agent responses
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // 1. Save the human message
    const humanResult = await query(
      `INSERT INTO messages (session_id, sender_type, sender_name, content)
       VALUES ($1, 'human', 'You', $2)
       RETURNING *`,
      [sessionId, content.trim()]
    );

    const humanMessage = humanResult.rows[0];

    // 2. Get session agents in hierarchy order
    const agentsResult = await query(
      `SELECT a.id, a.name, a.system_prompt, a.default_moods, sa.mood, sa.turn_order
       FROM session_agents sa
       JOIN agents a ON a.id = sa.agent_id
       WHERE sa.session_id = $1 AND sa.is_active = true
       ORDER BY sa.turn_order ASC`,
      [sessionId]
    );

    const agents = agentsResult.rows;

    // 3. Get recent message history for context
    const historyResult = await query(
      `SELECT sender_name as "senderName", content, sender_type as "senderType"
       FROM messages
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [sessionId]
    );
    const recentHistory = historyResult.rows.reverse();

    // 4. Have each agent respond in turn
    for (const agent of agents as { id: string; name: string; system_prompt: string; mood: string }[]) {
      const agentName = agent.name;
      const agentMood = agent.mood || 'neutral';
      
      // Build context for the agent
      const context = `You are ${agentName}. ${agent.system_prompt || ''}\n\nCurrent mood: ${agentMood}\n\nRecent conversation:\n${recentHistory.map(m => `${m.senderName}: ${m.content}`).join('\n')}\n\n${agentName}:`;

      // Call the LLM
      try {
        const llmResponse = await fetch(`${process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1'}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.MINIMAX_MODEL || 'MiniMax-Text-01',
            messages: [
              { role: 'user', content }
            ],
            max_tokens: 500,
            temperature: 0.8
          })
        });

        if (llmResponse.ok) {
          const llmData = await llmResponse.json();
          const agentContent = llmData.choices?.[0]?.message?.content || `${agentName} responds...`;

          // Save agent message
          await query(
            `INSERT INTO messages (session_id, sender_type, sender_id, sender_name, content)
             VALUES ($1, 'agent', $2, $3, $4)`,
            [sessionId, agent.id, agentName, agentContent]
          );
        }
      } catch (llmError) {
        console.error(`LLM error for ${agentName}:`, llmError);
        // Save a fallback message
        await query(
          `INSERT INTO messages (session_id, sender_type, sender_id, sender_name, content)
           VALUES ($1, 'agent', $2, $3, $4)`,
          [sessionId, agent.id, agentName, `${agentName} is thinking...`]
        );
      }
    }

    // 5. Return all messages including new ones
    const messagesResult = await query(
      `SELECT id, session_id as "sessionId", sender_type as "senderType", 
              sender_id as "senderId", sender_name as "senderName", 
              content, created_at as "createdAt"
       FROM messages 
       WHERE session_id = $1 
       ORDER BY created_at ASC`,
      [sessionId]
    );

    return NextResponse.json(messagesResult.rows);
  } catch (error) {
    console.error('Error in POST /api/sessions/[sessionId]/messages:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}