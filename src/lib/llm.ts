/**
 * MiniMax LLM Integration
 * Uses OpenAI-compatible API format
 */

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1';
const MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
}

/**
 * Generate chat completions using MiniMax OpenAI-compatible API
 */
export async function generateChatCompletion(
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  }
): Promise<LLMResponse> {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const { temperature = 0.8, maxTokens = 500, stream = false } = options || {};

  const response = await fetch(`${MINIMAX_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
    model: data.model || MINIMAX_MODEL,
  };
}

/**
 * Generate a simple text completion (convenience wrapper)
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const messages: LLMMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const response = await generateChatCompletion(messages, options);
  return response.content;
}

export { MINIMAX_MODEL, MINIMAX_BASE_URL };