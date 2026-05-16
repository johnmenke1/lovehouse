-- LoveHouse Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  soul_path VARCHAR(500) NOT NULL,
  avatar_url TEXT,
  system_prompt TEXT,
  default_moods TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  hierarchy_order UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Agents junction table
CREATE TABLE IF NOT EXISTS session_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  mood VARCHAR(100),
  turn_order INT,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(session_id, agent_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('human', 'agent')),
  sender_id UUID REFERENCES agents(id),
  sender_name VARCHAR(100),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turn Log table
CREATE TABLE IF NOT EXISTS turn_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  turn_number INT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  is_human BOOLEAN DEFAULT false,
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Memory table
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL CHECK (memory_type IN ('conversation', 'preference', 'fact', 'emotional')),
  content TEXT NOT NULL,
  importance INT DEFAULT 1 CHECK (importance >= 1 AND importance <= 10),
  context TEXT,
  source_session_id UUID REFERENCES sessions(id),
  source_message_id UUID REFERENCES messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  access_count INT DEFAULT 0
);

-- Session Memory table
CREATE TABLE IF NOT EXISTS session_memory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(agent_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_turn_log_session ON turn_log(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_session_agents_session ON session_agents(session_id);
CREATE INDEX IF NOT EXISTS idx_session_agents_agent ON session_agents(agent_id);

-- Functions
CREATE OR REPLACE FUNCTION increment_memory_access(memory_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_memory
  SET access_count = access_count + 1, last_accessed_at = NOW()
  WHERE id = memory_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (optional, enable as needed)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;