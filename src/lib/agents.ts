import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { query } from './db';
import type { Agent, ParsedSoul } from '@/types';

const AGENT_PROFILES_PATH = process.env.AGENT_PROFILES_PATH || '/home/john/.hermes/profiles';

export function getAgentProfilesDir(): string {
  return AGENT_PROFILES_PATH;
}

export function listAgentNames(): string[] {
  try {
    const entries = fs.readdirSync(AGENT_PROFILES_PATH, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function parseSoulFile(agentName: string): ParsedSoul | null {
  const soulPath = path.join(AGENT_PROFILES_PATH, agentName, 'SOUL.md');

  try {
    const content = fs.readFileSync(soulPath, 'utf-8');
    const { data, content: body } = matter(content);

    // Extract system prompt from body (first section before ---)
    const sections = body.split(/^---$/m);
    const systemPrompt = sections[0] || body;

    return {
      name: data.name || agentName,
      birthdate: data.birthdate,
      personality: data.personality || '',
      conversationStyle: data.conversationStyle || '',
      coreTruths: data.coreTruths || [],
      vibe: data.vibe || '',
      skills: data.skills,
      systemPrompt: systemPrompt.trim(),
    };
  } catch {
    return null;
  }
}

export function loadAllAgents(): Agent[] {
  const names = listAgentNames();
  const agents: Agent[] = [];

  for (const name of names) {
    const soul = parseSoulFile(name);
    if (soul) {
      agents.push({
        id: '', // Will be set by database
        name: soul.name,
        soulPath: path.join(AGENT_PROFILES_PATH, name, 'SOUL.md'),
        avatarUrl: null,
        systemPrompt: soul.systemPrompt,
        defaultMoods: ['neutral', 'playful', 'jealous', 'submissive', 'hungry', 'tired', 'horny'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return agents;
}

export function getAgentSystemPrompt(agentName: string): string | null {
  const soul = parseSoulFile(agentName);
  return soul?.systemPrompt || null;
}

// Database functions for agents
export async function getAgentsFromDb() {
  const result = await query('SELECT * FROM agents ORDER BY name');
  return result.rows;
}

export async function upsertAgent(
  name: string,
  soulPath: string,
  systemPrompt: string,
  defaultMoods: string[]
) {
  const result = await query(
    `INSERT INTO agents (name, soul_path, system_prompt, default_moods)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET
       soul_path = EXCLUDED.soul_path,
       system_prompt = EXCLUDED.system_prompt,
       default_moods = EXCLUDED.default_moods,
       updated_at = NOW()
     RETURNING *`,
    [name, soulPath, systemPrompt, JSON.stringify(defaultMoods)]
  );
  return result.rows[0];
}