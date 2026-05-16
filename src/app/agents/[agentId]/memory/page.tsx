import { getAgentMemory } from '@/lib/memory';
import type { Agent, MemoryEntry } from '@/types';

interface PageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentMemoryPage({ params }: PageProps) {
  const { agentId } = await params;
  const memories = await getAgentMemory(agentId);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Agent Memory</h1>
      <div className="space-y-2">
        {memories.map((memory: MemoryEntry) => (
          <div
            key={memory.id}
            className="p-4 border border-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-1 text-xs rounded bg-blue-600">
                {memory.memoryType}
              </span>
              <span className="text-xs text-gray-400">
                Importance: {memory.importance}
              </span>
            </div>
            <p className="text-gray-200">{memory.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}