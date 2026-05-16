'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import type { Agent } from '@/types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSessionModal({ isOpen, onClose }: CreateSessionModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return res.json();
    },
  });

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedAgents.length === 0) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          agentIds: selectedAgents,
        }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/sessions/${session.id}`);
        onClose();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Session">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Session Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Session"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Agents
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {agents?.map((agent: Agent) => (
              <label
                key={agent.id}
                className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedAgents.includes(agent.id)}
                  onChange={() => toggleAgent(agent.id)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-white">{agent.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || selectedAgents.length === 0 || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}