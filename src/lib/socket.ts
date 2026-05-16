'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '@/types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(socketUrl, {
      autoConnect: false,
    });
  }
  return socket;
}

export function useSocket(sessionId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const sock = getSocket();
    socketRef.current = sock;

    if (sessionId) {
      sock.emit('join_session', { sessionId });
    }

    return () => {
      if (sessionId) {
        sock.emit('leave_session', { sessionId });
      }
    };
  }, [sessionId]);

  return socketRef.current;
}

export interface SocketEvents {
  onMessageCreated: (callback: (message: Message) => void) => void;
  onAgentTyping: (callback: (data: { agentId: string; isTyping: boolean }) => void) => void;
  onTurnIndicator: (callback: (data: { turnNumber: number; currentSpeaker: string }) => void) => void;
  onError: (callback: (error: { code: string; message: string }) => void) => void;
}

export function createSocketListeners(
  socket: Socket,
  handlers: {
    onMessageCreated?: (message: Message) => void;
    onAgentTyping?: (data: { agentId: string; isTyping: boolean }) => void;
    onTurnIndicator?: (data: { turnNumber: number; currentSpeaker: string }) => void;
    onError?: (error: { code: string; message: string }) => void;
  }
) {
  if (handlers.onMessageCreated) {
    socket.on('message_created', handlers.onMessageCreated);
  }
  if (handlers.onAgentTyping) {
    socket.on('agent_typing', handlers.onAgentTyping);
  }
  if (handlers.onTurnIndicator) {
    socket.on('turn_indicator', handlers.onTurnIndicator);
  }
  if (handlers.onError) {
    socket.on('error', handlers.onError);
  }

  return () => {
    socket.off('message_created');
    socket.off('agent_typing');
    socket.off('turn_indicator');
    socket.off('error');
  };
}