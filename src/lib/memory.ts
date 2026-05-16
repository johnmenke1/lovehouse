import { query } from './db';
import type { MemoryEntry } from '@/types';

/**
 * Retrieves all memories for an agent
 */
export async function getAgentMemory(agentId: string): Promise<MemoryEntry[]> {
  const result = await query(
    `SELECT * FROM agent_memory 
     WHERE agent_id = $1 
     ORDER BY importance DESC, created_at DESC`,
    [agentId]
  );
  return result.rows as MemoryEntry[];
}

/**
 * Retrieves relevant memories for context injection
 */
export async function getRelevantMemories(
  agentId: string,
  _messageContent: string,
  limit = 10
): Promise<MemoryEntry[]> {
  const result = await query(
    `SELECT * FROM agent_memory 
     WHERE agent_id = $1 
     ORDER BY importance DESC, created_at DESC 
     LIMIT $2`,
    [agentId, limit]
  );
  return result.rows as MemoryEntry[];
}

/**
 * Adds a new memory entry
 */
export async function addMemory(
  agentId: string,
  memoryType: MemoryEntry['memoryType'],
  content: string,
  importance = 5,
  sourceSessionId?: string,
  sourceMessageId?: string
): Promise<MemoryEntry | null> {
  const result = await query(
    `INSERT INTO agent_memory (agent_id, memory_type, content, importance, source_session_id, source_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [agentId, memoryType, content, importance, sourceSessionId, sourceMessageId]
  );
  return result.rows[0] as MemoryEntry || null;
}

/**
 * Updates memory access statistics
 */
export async function updateMemoryAccess(memoryId: string): Promise<void> {
  await query(
    `UPDATE agent_memory 
     SET access_count = access_count + 1, last_accessed_at = NOW() 
     WHERE id = $1`,
    [memoryId]
  );
}

/**
 * Extracts key points from a conversation for memory storage
 */
export async function extractConversationMemory(
  agentId: string,
  messages: { role: string; content: string }[],
  sourceSessionId?: string
): Promise<void> {
  // Simple extraction: store the last message as a memory
  // In production, this would use LLM to summarize and extract key points
  if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    await addMemory(
      agentId,
      'conversation',
      lastMessage.content.slice(0, 500),
      3,
      sourceSessionId
    );
  }
}