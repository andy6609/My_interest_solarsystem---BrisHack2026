import type { ParsedData, UnifiedMessage } from '@/types';

interface ChatGPTCleanMessage {
  role: string;
  content: string;
  create_time: number;
}

interface ChatGPTCleanConversation {
  id: string;
  title: string;
  create_time: number;
  messages: ChatGPTCleanMessage[];
}

export function parseChatGPT(raw: string): ParsedData {
  const conversations: ChatGPTCleanConversation[] = JSON.parse(raw);
  const messages: UnifiedMessage[] = [];

  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (!msg.content?.trim()) continue;

      messages.push({
        id: `${conv.id}-${msg.create_time}`,
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: new Date(msg.create_time * 1000).toISOString(),
        platform: 'chatgpt',
        conversationId: conv.id,
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
