import type { ParsedData, UnifiedMessage } from '@/types';

interface ChatGPTExport {
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, {
    id: string;
    message: {
      author: { role: string };
      content: { parts: (string | object)[] };
      create_time: number;
    } | null;
    parent: string | null;
    children: string[];
  }>;
}

export function parseChatGPT(raw: string): ParsedData {
  const conversations: ChatGPTExport[] = JSON.parse(raw);
  const messages: UnifiedMessage[] = [];

  for (const conv of conversations) {
    for (const [nodeId, node] of Object.entries(conv.mapping)) {
      if (!node.message) continue;
      if (node.message.author.role === 'system') continue;

      const content = node.message.content.parts
        .filter((p) => typeof p === 'string')
        .join('\n')
        .trim();

      if (!content) continue;

      messages.push({
        id: nodeId,
        role: node.message.author.role === 'user' ? 'user' : 'assistant',
        content,
        timestamp: new Date(node.message.create_time * 1000).toISOString(),
        platform: 'chatgpt',
        conversationId: conv.title || 'untitled',
        conversationTitle: conv.title,
      });
    }
  }

  const sorted = messages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    messages: sorted,
    metadata: {
      platform: 'chatgpt',
      totalConversations: conversations.length,
      totalMessages: sorted.length,
      dateRange: {
        start: sorted[0]?.timestamp || '',
        end: sorted[sorted.length - 1]?.timestamp || '',
      },
    },
  };
}
