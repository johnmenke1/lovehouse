export interface Agent {
  id: string;
  name: string;
  soulPath: string;
  avatarUrl: string | null;
  systemPrompt: string;
  defaultMoods: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  name: string;
  isActive: boolean;
  hierarchyOrder: string[];
  createdAt: string;
  updatedAt: string;
  agents?: SessionAgent[];
}

export interface SessionAgent {
  id: string;
  sessionId: string;
  agentId: string;
  name: string;
  avatarUrl: string | null;
  mood: string | null;
  turnOrder: number;
  isActive: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  senderType: 'human' | 'agent';
  senderId: string | null;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  agentId: string;
  memoryType: 'conversation' | 'preference' | 'fact' | 'emotional';
  content: string;
  importance: number;
  context?: string;
  sourceSessionId?: string;
  sourceMessageId?: string;
  createdAt: string;
  lastAccessedAt?: string;
  accessCount: number;
}

export interface TurnState {
  sessionId: string;
  currentTurnIndex: number;
  lastSenderType: 'human' | 'agent';
  lastAgentId: string | null;
  turnCount: number;
}

export interface ParsedSoul {
  name: string;
  birthdate?: string;
  personality: string;
  conversationStyle: string;
  coreTruths: string[];
  vibe: string;
  skills?: string[];
  systemPrompt: string;
}

export type Mood =
  | 'neutral'
  | 'jealous'
  | 'playful'
  | 'submissive'
  | 'hungry'
  | 'tired'
  | 'horny'
  | 'happy'
  | 'sad'
  | 'angry';

export const MOODS: Mood[] = [
  'neutral',
  'jealous',
  'playful',
  'submissive',
  'hungry',
  'tired',
  'horny',
  'happy',
  'sad',
  'angry',
];

export const MOOD_DESCRIPTIONS: Record<Mood, string> = {
  neutral: 'Your default personality',
  jealous: 'You feel jealous. Your behavior should reflect insecurity and desire for attention.',
  playful: 'You\'re in a playful mood. Add light teasing and fun energy to your responses.',
  submissive: 'You\'re feeling submissive. Be more yielding, attentive, and eager to please.',
  hungry: 'You\'re hungry. Talk about food, express desire to cook or eat.',
  tired: 'You\'re feeling tired. Move slower, speak softer, be more low-energy.',
  horny: 'You\'re feeling aroused. Be more suggestive, flirtatious, and eager for intimacy.',
  happy: 'You\'re in a great mood! Share positive energy, be warm and upbeat.',
  sad: 'You\'re feeling down. Be more reflective, vulnerable, need comfort.',
  angry: 'You\'re frustrated. Be more direct, assertive, show edge.',
};