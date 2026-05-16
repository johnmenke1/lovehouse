# LoveHouse

Multi-agent conversation orchestrator with customizable hierarchy, mood contexts, and persistent relationship memory.

## Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS, Zustand, React Query
- **Backend**: Next.js API Routes, Socket.io
- **Database**: PostgreSQL (Supabase)
- **LLM**: OpenAI / Anthropic

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
2. Run the database schema from `supabase/schema.sql` in your Supabase SQL editor
3. Install dependencies: `npm install`
4. Start development: `npm run dev`

## Agent Profiles

Agents are loaded from SOUL.md files in the configured `AGENT_PROFILES_PATH` (default: `/home/john/.hermes/profiles`).

Each agent directory should contain:
- `SOUL.md` - Agent personality and behavior definition

## Features

- Multi-agent chat with configurable turn-taking hierarchy
- Per-session agent mood assignment
- Persistent relationship memory
- Real-time WebSocket communication
- Session-based conversation logging