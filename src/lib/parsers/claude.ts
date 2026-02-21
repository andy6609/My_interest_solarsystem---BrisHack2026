import type { ParsedData, UnifiedMessage } from '@/types';

interface ClaudeExport {
  conversations: Array<{
    uuid: string;
    name: string;
    created_at: string;
    updated_at: string;
    chat_messages: Array<{
      uuid: string;
      text: string;
      sender: 'human' | 'assistant';
      created_at: string;
    }>;
  }>;
}

export function parseClaude(raw: string): ParsedData {
  const data: ClaudeExport = JSON.parse(raw);
  const messages: UnifiedMessage[] = [];

  for (const conv of data.conversations) {
    for (const msg of conv.chat_messages) {
      if (!msg.text?.trim()) continue;

      messages.push({
        id: msg.uuid,
        role: msg.sender === 'human' ? 'user' : 'assistant',
        content: msg.text.trim(),
        timestamp: msg.created_at,
        platform: 'claude',
        conversationId: conv.uuid,
        conversationTitle: conv.name,
      });
    }
  }

  const sorted = messages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    messages: sorted,
    metadata: {
      platform: 'claude',
      totalConversations: data.conversations.length,
      totalMessages: sorted.length,
      dateRange: {
        start: sorted[0]?.timestamp || '',
        end: sorted[sorted.length - 1]?.timestamp || '',
      },
    },
  };
}
