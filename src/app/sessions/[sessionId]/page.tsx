'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { MessageList } from '@/components/chat/MessageList';
import { InputBar } from '@/components/chat/InputBar';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

interface AgentInfo {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface SessionAgent {
  id: string;
  agent_id: string;
  turn_order: number;
  mood: string;
  agent: AgentInfo;
}

interface SessionData {
  id: string;
  name: string;
  session_agents: SessionAgent[];
}

interface Message {
  id: string;
  sessionId: string;
  senderType: 'human' | 'agent';
  senderId: string | null;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function SessionChatPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) throw new Error('Failed to fetch session');
        const data = await res.json();
        setSession(data);
      } catch (err) {
        setError('Failed to load session');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSession();
  }, [sessionId]);

  // Fetch messages
  useEffect(() => {
    async function fetchMessages() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/messages`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    }
    fetchMessages();
    
    // Poll for new messages every 2 seconds
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add human message immediately
    const humanMessage: Message = {
      id: `temp-${Date.now()}`,
      sessionId,
      senderType: 'human',
      senderId: null,
      senderName: 'You',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, humanMessage]);

    // Show typing indicator for agents
    setIsTyping(true);

    try {
      // Send to API - it will handle agent response generation
      const res = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      // Refresh messages after agent responses
      const messagesRes = await fetch(`/api/sessions/${sessionId}/messages`);
      if (messagesRes.ok) {
        const data = await messagesRes.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsTyping(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error || 'Session not found'}</div>
      </div>
    );
  }

  const activeAgents = session.session_agents?.filter((sa) => sa.agent) || [];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{session.name}</h1>
            <p className="text-sm text-gray-400">
              Chatting with {activeAgents.map(a => a.agent.name).join(', ')}
            </p>
          </div>
          <div className="flex -space-x-2">
            {activeAgents.slice(0, 4).map((sa) => (
              <div
                key={sa.id}
                className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-medium border-2 border-gray-800"
                title={sa.agent.name}
              >
                {sa.agent.name?.[0] || '?'}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
        {isTyping && <TypingIndicator />}
      </div>

      {/* Input */}
      <InputBar
        onSend={handleSendMessage}
        placeholder="Type a message to start the conversation..."
        disabled={isTyping}
      />
    </div>
  );
}