/**
 * Generate Agent Response
 * Combines system prompt, memories, mood, and conversation context
 */

import { generateChatCompletion, type LLMMessage } from './llm';
import { getAgentSystemPrompt } from './agents';
import { getRelevantMemories } from './memory';
import { MOOD_DESCRIPTIONS, type Mood } from '@/types';

export interface GenerateResponseOptions {
  agentName: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    senderName: string;
    content: string;
  }>;
  currentMood?: Mood;
  systemContext?: string;
  maxTokens?: number;
}

/**
 * Build the full prompt with system prompt, memories, and conversation
 */
export async function buildPrompt(options: GenerateResponseOptions): Promise<LLMMessage[]> {
  const { agentName, conversationHistory, currentMood, systemContext } = options;

  // Get agent's system prompt from SOUL.md
  const agentSystemPrompt = getAgentSystemPrompt(agentName);

  // Get relevant memories
  const memories = await getRelevantMemories(agentName, conversationHistory[conversationHistory.length - 1]?.content || '', 5);

  // Build messages array
  const messages: LLMMessage[] = [];

  // System prompt with agent personality
  let fullSystemPrompt = agentSystemPrompt || `You are ${agentName}.`;

  // Add mood context if specified
  if (currentMood && currentMood !== 'neutral') {
    const moodDescription = MOOD_DESCRIPTIONS[currentMood] || '';
    fullSystemPrompt += `\n\nCurrent mood: ${moodDescription}`;
  }

  // Add system context if provided
  if (systemContext) {
    fullSystemPrompt += `\n\nContext: ${systemContext}`;
  }

  messages.push({ role: 'system', content: fullSystemPrompt });

  // Add memories section
  if (memories.length > 0) {
    const memoriesSection = memories
      .map(m => `[${m.memoryType}] ${m.content}`)
      .join('\n');
    messages.push({
      role: 'system',
      content: `Important memories:\n${memoriesSection}`,
    });
  }

  // Add conversation history
  for (const msg of conversationHistory) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    messages.push({
      role,
      content: `${msg.senderName}: ${msg.content}`,
    });
  }

  return messages;
}

/**
 * Generate a response for the agent
 */
export async function generateAgentResponse(
  options: GenerateResponseOptions
): Promise<string> {
  const { agentName, conversationHistory, currentMood, systemContext, maxTokens = 500 } = options;

  // Build the prompt messages
  const messages = await buildPrompt({
    agentName,
    conversationHistory,
    currentMood,
    systemContext,
  });

  // Call the LLM
  const response = await generateChatCompletion(messages, {
    temperature: 0.8,
    maxTokens,
    stream: false,
  });

  return response.content;
}