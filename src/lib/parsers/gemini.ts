import type { ParsedData, UnifiedMessage } from '@/types';

/**
 * Google Takeout "내 활동" JSON 포맷 (Gemini 앱)
 * 배열 of activity items
 */
interface GeminiActivity {
  header: string;
  title: string;
  time: string;
  products?: string[];
  activityControls?: string[];
  safeHtmlItem?: Array<{ html: string }>;
  subtitles?: Array<{ name: string; url?: string }>;
  attachedFiles?: string[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseGemini(raw: string): ParsedData {
  const data: GeminiActivity[] = JSON.parse(raw);
  const messages: UnifiedMessage[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item.title?.trim()) continue;

    // "항목을 검색함" 같은 Google Activity 접미사 제거
    const userContent = item.title
      .replace(/\s*항목을 검색함\s*$/, '')
      .trim();

    if (!userContent) continue;

    const convId = `gemini-conv-${i}`;

    // 유저 메시지
    messages.push({
      id: `gemini-user-${i}`,
      role: 'user',
      content: userContent,
      timestamp: item.time,
      platform: 'gemini',
      conversationId: convId,
      conversationTitle: userContent.slice(0, 50),
    });

    // Gemini 응답 (HTML → 텍스트)
    if (item.safeHtmlItem?.[0]?.html) {
      const assistantContent = stripHtml(item.safeHtmlItem[0].html);
      if (assistantContent) {
        messages.push({
          id: `gemini-assistant-${i}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: item.time,
          platform: 'gemini',
          conversationId: convId,
          conversationTitle: userContent.slice(0, 50),
        });
      }
    }
  }

  const sorted = messages.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const conversations = new Set(sorted.map((m) => m.conversationId));

  return {
    messages: sorted,
    metadata: {
      platform: 'gemini',
      totalConversations: conversations.size,
      totalMessages: sorted.length,
      dateRange: {
        start: sorted[0]?.timestamp || '',
        end: sorted[sorted.length - 1]?.timestamp || '',
      },
    },
  };
}
