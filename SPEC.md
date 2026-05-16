# LoveHouse - Multi-Agent Chat Orchestrator

## Overview

LoveHouse is a web application enabling multi-agent conversations with customizable hierarchy, mood contexts, and persistent relationship memory. Inspired by Character.ai but designed for personal AI companions with rich memory systems.

**Architecture Summary:**
- Next.js frontend with real-time WebSocket communication
- PostgreSQL via Supabase for persistence
- Agent profiles loaded from SOUL.md files in `~/.hermes/profiles/`
- Turn-based conversation with configurable agent hierarchy per session

---

## 1. Database Schema

### Core Tables

```sql
-- Agents: loaded from SOUL.md, extended with runtime state
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  soul_path VARCHAR(500) NOT NULL,          -- Path to SOUL.md file
  avatar_url TEXT,
  system_prompt TEXT,                        -- Extracted from SOUL.md
  default_moods TEXT[],                      -- Available moods for this agent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions: a conversation instance with selected agents
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  hierarchy_order UUID[],                    -- Ordered agent IDs for turn-taking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Agents: agents assigned to a session with their mood
CREATE TABLE session_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  mood VARCHAR(100),                         -- Current mood for this session
  turn_order INT,                            -- Position in turn hierarchy
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, agent_id)
);

-- Messages: all conversation messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL,          -- 'human' | 'agent'
  sender_id UUID REFERENCES agents(id),      -- NULL for human
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn Log: tracks who spoke when (for turn-taking logic)
CREATE TABLE turn_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  is_human BOOLEAN DEFAULT false,
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory: persistent memory per agent (relationship history)
CREATE TABLE agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL,         -- 'conversation' | 'preference' | 'fact' | 'emotional'
  content TEXT NOT NULL,
  importance INT DEFAULT 1,                  -- 1-10 scale
  source_session_id UUID REFERENCES sessions(id),
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Memory: session-specific context and notes
CREATE TABLE session_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, key)
);
```

### Indexes

```sql
CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_agent_memory_agent ON agent_memory(agent_id, created_at);
CREATE INDEX idx_agent_memory_type ON agent_memory(agent_id, memory_type);
CREATE INDEX idx_turn_log_session ON turn_log(session_id, turn_number);
```

---

## 2. API Design

### REST Endpoints

#### Agents
```
GET    /api/agents                    - List all agents
GET    /api/agents/:id                - Get agent details
POST   /api/agents/sync               - Sync agents from SOUL.md files
GET    /api/agents/:id/memory         - Get agent's memory
POST   /api/agents/:id/memory         - Add memory to agent
```

#### Sessions
```
GET    /api/sessions                  - List sessions
POST   /api/sessions                  - Create session
GET    /api/sessions/:id              - Get session details
PUT    /api/sessions/:id              - Update session (name, hierarchy)
DELETE /api/sessions/:id              - Delete session
POST   /api/sessions/:id/agents       - Add agent to session
DELETE /api/sessions/:id/agents/:agentId - Remove agent from session
PUT    /api/sessions/:id/agents/:agentId/mood - Update agent mood
```

#### Messages
```
GET    /api/sessions/:id/messages     - Get session messages (paginated)
POST   /api/sessions/:id/messages     - Send message (human or agent)
```

#### WebSocket Events
```
Client -> Server:
  join_session     { sessionId }
  send_message     { sessionId, content, senderType }
  typing_start     { sessionId, agentId }
  typing_end       { sessionId, agentId }

Server -> Client:
  message_created  { message }
  agent_typing     { agentId, isTyping }
  turn_indicator   { turnNumber, agentId }
  error            { code, message }
```

### API Response Shapes

```typescript
// Session with agents
interface SessionResponse {
  id: string;
  name: string;
  isActive: boolean;
  agents: SessionAgent[];
  createdAt: string;
  updatedAt: string;
}

interface SessionAgent {
  id: string;
  agentId: string;
  name: string;
  avatarUrl: string;
  mood: string;
  turnOrder: number;
}

// Message
interface MessageResponse {
  id: string;
  sessionId: string;
  senderType: 'human' | 'agent';
  senderId: string | null;
  senderName: string;
  content: string;
  createdAt: string;
}
```

---

## 3. Component Architecture

```
components/
├── layout/
│   ├── AppShell.tsx           # Main layout with sidebar
│   ├── Sidebar.tsx            # Session list, agent selection
│   └── Header.tsx             # Current session info
├── chat/
│   ├── ChatWindow.tsx         # Main conversation view
│   ├── MessageList.tsx        # Scrollable message feed
│   ├── MessageBubble.tsx      # Individual message
│   ├── TypingIndicator.tsx    # Agent typing animation
│   ├── TurnIndicator.tsx      # Shows current speaker
│   └── InputBar.tsx           # Message input with send
├── session/
│   ├── SessionList.tsx        # All sessions sidebar
│   ├── SessionCard.tsx        # Session preview
│   ├── CreateSessionModal.tsx # New session form
│   ├── AgentSelector.tsx      # Multi-select agents for session
│   └── HierarchyEditor.tsx    # Drag-drop reorder agents
├── agents/
│   ├── AgentAvatar.tsx        # Agent icon with mood badge
│   ├── AgentMoodPicker.tsx    # Mood selector dropdown
│   └── AgentMemoryView.tsx    # View/edit agent memory
├── memory/
│   ├── MemoryPanel.tsx        # Full memory sidebar
│   ├── MemoryItem.tsx         # Single memory entry
│   └── Memoryadder.tsx        # Add new memory
└── ui/
    ├── Button.tsx
    ├── Modal.tsx
    ├── Dropdown.tsx
    └── Spinner.tsx
```

---

## 4. Turn-Taking Logic

### Hierarchy System

Each session has a configurable `hierarchy_order` (array of agent UUIDs). Turn-taking follows this order after the human speaks.

```
Turn Flow:
1. Human sends message
2. Message saved with senderType='human'
3. Turn assigned to first agent in hierarchy
4. Agent processes message (using SOUL.md + mood + memory)
5. Response saved, turn advances to next agent in hierarchy
6. Repeat until end of hierarchy, then wait for human
```

### Turn Rules

1. **Human always starts** - First message in any session must be from human
2. **Sequential agents** - After human, agents respond in hierarchy order
3. **One response per turn** - Each agent speaks once before cycling
4. **Mood affects response** - Agent's current mood modifies their SOUL.md behavior
5. **Memory context** - Agent's relevant memories are injected into context

### Implementation

```typescript
interface TurnState {
  sessionId: string;
  currentTurnIndex: number;     // Index in hierarchy array
  lastSenderType: 'human' | 'agent';
  turnCount: number;             // Total turns in session
}

function getNextSpeaker(state: TurnState, hierarchy: string[]): string | 'human' {
  if (state.lastSenderType === 'human') {
    return hierarchy[0];  // First agent in hierarchy
  }
  
  // Find last agent's position, move to next
  const lastAgentIndex = hierarchy.indexOf(state.lastAgentId);
  const nextIndex = (lastAgentIndex + 1) % hierarchy.length;
  
  if (nextIndex === 0) {
    return 'human';  // Cycle complete, human's turn
  }
  return hierarchy[nextIndex];
}
```

### Real-time Turn Updates

WebSocket broadcasts `turn_indicator` event whenever turn changes:
```json
{
  "type": "turn_indicator",
  "sessionId": "uuid",
  "turnNumber": 5,
  "currentSpeaker": { "id": "uuid", "name": "Emma", "isTyping": true }
}
```

---

## 5. Memory System

### Memory Architecture

```
Agent Memory
├── Conversation Memory (auto-captured)
│   └── Key topics, decisions, emotional moments
├── Preference Memory (explicit)
│   └── Likes, dislikes, boundaries learned over time
├── Fact Memory (structured)
│   └── Names, dates, relationships, events
└── Emotional Memory (weighted)
    └── Significant positive/negative interactions
```

### Memory Storage

```typescript
interface MemoryEntry {
  id: string;
  agentId: string;
  type: 'conversation' | 'preference' | 'fact' | 'emotional';
  content: string;
  importance: number;        // 1-10, affects retrieval priority
  context?: string;          // Surrounding context for reconstruction
  sourceSessionId?: string;
  sourceMessageId?: string;
  createdAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
}
```

### Memory Retrieval

When an agent responds, relevant memories are injected into context:

```typescript
async function getRelevantMemories(agentId: string, messageContent: string, limit = 10): Promise<MemoryEntry[]> {
  // 1. Semantic search on memory content
  // 2. Filter by memory type importance
  // 3. Recency boost
  // 4. Return top N memories
}
```

### Memory Extraction Triggers

- **After each agent response** - Capture key points
- **Session end** - Summarize and store important events
- **Explicit user request** - "Remember that I hate X"
- **Relationship growth events** - Milestones, emotional highs

---

## 6. Agent Integration

### SOUL.md Parsing

Agents are loaded from `~/.hermes/profiles/{agent_name}/SOUL.md`:

```typescript
interface ParsedSoul {
  name: string;
  birthdate?: string;
  personality: string;
  conversationStyle: string;
  coreTruths: string[];
  vibe: string;
  skills?: string[];
  systemPrompt: string;  // Combined prompt for LLM
}
```

### Agent Runtime State

```typescript
interface AgentRuntime {
  agentId: string;
  sessionId: string;
  mood: string;
  moodIntensity: number;     // 0-1, affects mood effect
  isTyping: boolean;
  currentResponse?: string;
  memoryContext: MemoryEntry[];
}
```

### Mood System

Moods modify agent behavior by injecting context:

```
jealous:     "You feel jealous right now. Your behavior should reflect insecurity and desire for attention."
playful:     "You're in a playful mood. Add light teasing and fun energy to your responses."
submissive:  "You're feeling submissive. Be more yielding, attentive, and eager to please."
hungry:      "You're hungry. Talk about food, express desire to cook or eat."
```

Mood is stored per-agent per-session in `session_agents.mood`.

### LLM Integration

Agent responses are generated via LLM API with constructed prompt:

```
System: [Agent's SOUL.md system prompt]

Context:
- Current mood: [mood]
- Mood description: [mood context]
- Recent memories: [top 3-5 relevant memories as context]
- Relationship state: [brief summary of relationship]

Conversation:
[Last 5-10 messages for context]

Now respond as [Agent Name]:
```

---

## 7. Page Structure

```
app/
├── page.tsx                    # Redirect to /sessions
├── layout.tsx                  # Root layout with providers
├── sessions/
│   ├── page.tsx                # Session list
│   └── [sessionId]/
│       └── page.tsx           # Active chat session
├── agents/
│   └── page.tsx                # Agent management
└── api/
    ├── agents/
    ├── sessions/
    ├── messages/
    └── memory/
```

---

## 8. Technology Stack

### Frontend
- **Next.js 14** with App Router
- **React 18** with Suspense
- **TailwindCSS** for styling
- **Zustand** for client state
- **React Query** for server state
- **Socket.io-client** for WebSocket

### Backend
- **Next.js API Routes** for REST
- **Socket.io** for WebSocket server
- **Supabase** for PostgreSQL + Auth
- **LLM API** (configurable: OpenAI, Anthropic, local)

### Infrastructure
- **GitHub** for repository
- **Vercel** for deployment

---

## 9. File Structure

```
lovehouse/
├── SPEC.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .gitignore
├── public/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── sessions/
│   │   │   ├── page.tsx
│   │   │   └── [sessionId]/
│   │   │       └── page.tsx
│   │   └── api/
│   │       ├── agents/
│   │       ├── sessions/
│   │       ├── messages/
│   │       └── socket/
│   ├── components/
│   │   ├── layout/
│   │   ├── chat/
│   │   ├── session/
│   │   ├── agents/
│   │   ├── memory/
│   │   └── ui/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── socket.ts
│   │   ├── agents.ts
│   │   ├── turn-taking.ts
│   │   └── memory.ts
│   ├── types/
│   │   └── index.ts
│   └── hooks/
│       ├── useSocket.ts
│       ├── useSession.ts
│       └── useMessages.ts
└── supabase/
    └── schema.sql
```

---

## 10. Configuration

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM
OPENAI_API_KEY=                    # Or ANTHROPIC_API_KEY
LLM_MODEL=gpt-4o

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
AGENT_PROFILES_PATH=/home/john/.hermes/profiles
```

### Agent Profiles Path

Agents are loaded from configurable path (default: `~/.hermes/profiles/`). Each agent should have:
- `SOUL.md` - Main personality and behavior definition
- Optional `skills/` directory with skill files

---

## 11. Future Considerations

- [ ] Multi-language support
- [ ] Voice messages
- [ ] Image generation/display
- [ ] Session branching (branch conversation)
- [ ] Memory consolidation (periodic summarization)
- [ ] Shared sessions (multiple humans)
- [ ] Agent-to-agent communication rules