import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// PUT /api/agents/[agentId]/system-prompt - Update agent's system prompt
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const body = await request.json();
    const { system_prompt } = body;

    if (!system_prompt) {
      return NextResponse.json({ error: 'system_prompt is required' }, { status: 400 });
    }

    await query(
      `UPDATE agents SET system_prompt = $1, updated_at = NOW() WHERE id = $2`,
      [system_prompt, agentId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating agent system prompt:', error);
    return NextResponse.json({ error: 'Failed to update system prompt' }, { status: 500 });
  }
}