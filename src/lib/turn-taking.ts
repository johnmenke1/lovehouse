import type { TurnState } from '@/types';

/**
 * Determines the next speaker based on turn-taking rules.
 *
 * Rules:
 * 1. Human always starts the conversation
 * 2. After human, agents respond in hierarchy order
 * 3. Each agent speaks once before cycling back
 * 4. After last agent, turn returns to human
 */
export function getNextSpeaker(state: TurnState, hierarchy: string[]): string | 'human' {
  if (hierarchy.length === 0) {
    return 'human';
  }

  // If last sender was human, first agent speaks
  if (state.lastSenderType === 'human') {
    return hierarchy[0];
  }

  // Find last agent's position in hierarchy
  if (!state.lastAgentId) {
    return hierarchy[0];
  }

  const lastAgentIndex = hierarchy.indexOf(state.lastAgentId);

  // If agent not found in hierarchy, start from beginning
  if (lastAgentIndex === -1) {
    return hierarchy[0];
  }

  // Move to next agent in hierarchy
  const nextIndex = (lastAgentIndex + 1) % hierarchy.length;

  // If we're back to the first agent, it's human's turn
  if (nextIndex === 0) {
    return 'human';
  }

  return hierarchy[nextIndex];
}

/**
 * Creates initial turn state for a new session
 */
export function createTurnState(sessionId: string): TurnState {
  return {
    sessionId,
    currentTurnIndex: 0,
    lastSenderType: 'human', // Human starts
    lastAgentId: null,
    turnCount: 0,
  };
}

/**
 * Advances the turn state after a message is sent
 */
export function advanceTurn(
  state: TurnState,
  senderType: 'human' | 'agent',
  senderId: string | null
): TurnState {
  return {
    ...state,
    lastSenderType: senderType,
    lastAgentId: senderType === 'agent' ? senderId : state.lastAgentId,
    turnCount: state.turnCount + 1,
    currentTurnIndex:
      senderType === 'human'
        ? 0
        : (state.currentTurnIndex + 1) % (state.turnCount > 0 ? getAgentCount(state) : 1),
  };
}

function getAgentCount(state: TurnState): number {
  // This would typically come from session data
  // For now, assume at least 1
  return 1;
}

/**
 * Determines if the current turn belongs to a specific agent
 */
export function isAgentTurn(state: TurnState, agentId: string, hierarchy: string[]): boolean {
  const nextSpeaker = getNextSpeaker(state, hierarchy);
  return nextSpeaker === agentId;
}

/**
 * Checks if it's the human's turn
 */
export function isHumanTurn(state: TurnState, hierarchy: string[]): boolean {
  return getNextSpeaker(state, hierarchy) === 'human';
}