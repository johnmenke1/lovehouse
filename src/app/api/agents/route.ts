import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { listAgentNames, parseSoulFile } from '@/lib/agents';

// GET /api/agents - List all agents
export async function GET() {
  try {
    // First, try to get agents from database
    let dbAgents: unknown[] = [];
    try {
      const result = await query('SELECT * FROM agents ORDER BY name');
      dbAgents = result.rows;
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    // If no agents in DB, sync from SOUL.md files
    if (!dbAgents || dbAgents.length === 0) {
      const agentNames = listAgentNames();
      const agents = [];

      for (const name of agentNames) {
        const soul = parseSoulFile(name);
        if (soul) {
          try {
            const result = await query(
              `INSERT INTO agents (name, soul_path, system_prompt, default_moods)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (name) DO UPDATE SET
                 soul_path = EXCLUDED.soul_path,
                 system_prompt = EXCLUDED.system_prompt,
                 default_moods = EXCLUDED.default_moods,
                 updated_at = NOW()
               RETURNING *`,
              [soul.name, `/home/john/.hermes/profiles/${name}/SOUL.md`, soul.systemPrompt, JSON.stringify(['neutral', 'playful', 'jealous', 'submissive', 'hungry', 'tired', 'horny'])]
            );
            if (result.rows[0]) {
              agents.push(result.rows[0]);
            }
          } catch (err) {
            console.error('Error upserting agent:', err);
          }
        }
      }

      return NextResponse.json(agents);
    }

    return NextResponse.json(dbAgents);
  } catch (error) {
    console.error('Error in GET /api/agents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/agents/sync - Sync agents from SOUL.md files
export async function POST() {
  try {
    const agentNames = listAgentNames();
    const agents = [];

    for (const name of agentNames) {
      const soul = parseSoulFile(name);
      if (soul) {
        try {
          const result = await query(
            `INSERT INTO agents (name, soul_path, system_prompt, default_moods)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (name) DO UPDATE SET
               soul_path = EXCLUDED.soul_path,
               system_prompt = EXCLUDED.system_prompt,
               default_moods = EXCLUDED.default_moods,
               updated_at = NOW()
             RETURNING *`,
            [soul.name, `/home/john/.hermes/profiles/${name}/SOUL.md`, soul.systemPrompt, JSON.stringify(['neutral', 'playful', 'jealous', 'submissive', 'hungry', 'tired', 'horny'])]
          );
          if (result.rows[0]) {
            agents.push(result.rows[0]);
          }
        } catch (err) {
          console.error('Error upserting agent:', err);
        }
      }
    }

    return NextResponse.json({ synced: agents.length, agents });
  } catch (error) {
    console.error('Error in POST /api/agents/sync:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}