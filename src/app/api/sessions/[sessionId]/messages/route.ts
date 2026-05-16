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
    await query(
      `INSERT INTO messages (session_id, sender_type, sender_name, content)
       VALUES ($1, 'human', 'You', $2)`,
      [sessionId, content.trim()]
    );

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
       LIMIT 50`,
      [sessionId]
    );
    const recentHistory = (historyResult.rows as { senderName: string; content: string; senderType: string }[]).reverse();

    // 4. Have each agent respond in turn
    for (const agent of agents as { id: string; name: string; system_prompt: string; mood: string }[]) {
      const agentName = agent.name;
      const agentMood = agent.mood || 'neutral';
      
      // Build messages array for the agent
      const systemPrompt = `${agent.system_prompt || `You are ${agentName}.`}

Current mood: ${agentMood}

Instructions: You are in a roleplay conversation. Stay in character as ${agentName} at all times. Be natural, engaging, and true to your personality.`;

      const conversationMessages = recentHistory.map(m => ({
        role: m.senderType === 'human' ? 'user' : 'assistant',
        content: `${m.senderName}: ${m.content}`
      }));

      // Call Hermes API (primary) or MiniMax (fallback)
      let agentContent: string;
      
      const hermesUrl = process.env.HERMES_API_URL;
      
      if (hermesUrl) {
        // Use Hermes API (OpenAI-compatible format) - PRIMARY
        agentContent = await callHermesAPI(hermesUrl, agentName, systemPrompt, conversationMessages, content);
      } else {
        // Fall back to MiniMax only if Hermes is not configured
        agentContent = await callMinimaxAPI(agentName, agent.system_prompt, agentMood, recentHistory, content);
      }

      // Save agent message
      await query(
        `INSERT INTO messages (session_id, sender_type, sender_id, sender_name, content)
         VALUES ($1, 'agent', $2, $3, $4)`,
        [sessionId, agent.id, agentName, agentContent]
      );
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

async function callHermesAPI(
  hermesUrl: string,
  agentName: string,
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[],
  newMessage: string
): Promise<string> {
  try {
    const apiKey = process.env.HERMES_API_KEY || '';
    const model = process.env.HERMES_MODEL || 'hermes-agent';
    
    console.log(`[Hermes] Calling ${hermesUrl}/chat/completions for ${agentName}`);
    
    // Build messages array - system prompt + history + new message
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage }
    ];

    const response = await fetch(`${hermesUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.8,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hermes] API error for ${agentName}:`, response.status, errorText);
      return `${agentName} is here and ready to chat! 💋`;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || `${agentName} is here!`;
    
    // Strip any reasoning tokens
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    return content;
  } catch (error) {
    console.error(`[Hermes] Error for ${agentName}:`, error);
    return `${agentName} is thinking...`;
  }
}

async function callMinimaxAPI(
  agentName: string,
  systemPrompt: string,
  agentMood: string,
  recentHistory: { senderName: string; content: string; senderType: string }[],
  newMessage: string
): Promise<string> {
  try {
    const model = process.env.MINIMAX_MODEL || 'minimax-m2.7';
    const baseUrl = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
    const apiKey = process.env.MINIMAX_API_KEY || '';
    console.log(`[MiniMax] baseUrl=${baseUrl}, model=${model}, keyPrefix=${apiKey.substring(0, 10)}...`);
    
    const context = `You are ${agentName}. ${systemPrompt || ''}

Current mood: ${agentMood}

Recent conversation:
${recentHistory.map(m => `${m.senderName}: ${m.content}`).join('\n')}

${agentName}:`;

    const llmResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: context + '\n\n' + newMessage }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[MiniMax] API error for ${agentName}:`, llmResponse.status, errorText);
      return `${agentName} is here and ready to chat! 💋`;
    }

    const llmData = await llmResponse.json();
    let agentContent = llmData.choices?.[0]?.message?.content || `${agentName} is here!`;
    // Strip reasoning tokens if present (MiniMax M2.7 adds internal reasoning)
    agentContent = agentContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return agentContent;
  } catch (llmError) {
    console.error(`[MiniMax] Error for ${agentName}:`, llmError);
    return `${agentName} is thinking...`;
  }
}