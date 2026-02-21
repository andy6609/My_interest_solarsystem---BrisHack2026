import type { ParsedData, UnifiedMessage } from '@/types';

export function parsePlainText(raw: string): ParsedData {
  const lines = raw.split('\n').filter((l) => l.trim().length > 10);

  const messages: UnifiedMessage[] = lines.map((line, i) => ({
    id: `text-${i}`,
    role: 'user' as const,
    content: line.trim(),
    timestamp: new Date().toISOString(),
    platform: 'other' as const,
    conversationId: 'imported',
  }));

  return {
    messages,
    metadata: {
      platform: 'plaintext',
      totalConversations: 1,
      totalMessages: messages.length,
      dateRange: { start: '', end: '' },
    },
  };
}
