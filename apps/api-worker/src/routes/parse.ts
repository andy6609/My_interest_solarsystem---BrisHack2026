import { Hono } from 'hono';
import JSZip from 'jszip';

type Bindings = {
  UPLOAD_BUCKET: R2Bucket;
};

export const parseRoute = new Hono<{ Bindings: Bindings }>();

// ─── Types ───

interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  platform: 'chatgpt' | 'claude' | 'gemini' | 'other';
  conversationId: string;
  conversationTitle?: string;
}

interface ParsedData {
  messages: UnifiedMessage[];
  metadata: {
    platform: string;
    totalConversations: number;
    totalMessages: number;
    dateRange: { start: string; end: string };
  };
}

// ─── Parsers ───

function parseChatGPT(raw: string): ParsedData {
  const conversations = JSON.parse(raw) as {
    id: string; title: string; create_time: number;
    messages: { role: string; content: string; create_time: number }[];
  }[];
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
  const sorted = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return {
    messages: sorted,
    metadata: {
      platform: 'chatgpt',
      totalConversations: conversations.length,
      totalMessages: sorted.length,
      dateRange: { start: sorted[0]?.timestamp || '', end: sorted[sorted.length - 1]?.timestamp || '' },
    },
  };
}

function parseClaude(raw: string): ParsedData {
  const data = JSON.parse(raw) as {
    conversations: Array<{
      uuid: string; name: string;
      chat_messages: Array<{ uuid: string; text: string; sender: 'human' | 'assistant'; created_at: string }>;
    }>;
  };
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
  const sorted = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return {
    messages: sorted,
    metadata: {
      platform: 'claude',
      totalConversations: data.conversations.length,
      totalMessages: sorted.length,
      dateRange: { start: sorted[0]?.timestamp || '', end: sorted[sorted.length - 1]?.timestamp || '' },
    },
  };
}

function parseGemini(raw: string): ParsedData {
  const data = JSON.parse(raw) as Array<{
    header: string; title: string; time: string;
    safeHtmlItem?: Array<{ html: string }>;
  }>;
  const messages: UnifiedMessage[] = [];

  function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const userContent = item.title?.replace(/\s*항목을 검색함\s*$/, '').trim();
    if (!userContent) continue;
    const convId = `gemini-conv-${i}`;
    messages.push({ id: `gemini-user-${i}`, role: 'user', content: userContent, timestamp: item.time, platform: 'gemini', conversationId: convId, conversationTitle: userContent.slice(0, 50) });
    if (item.safeHtmlItem?.[0]?.html) {
      const assistantContent = stripHtml(item.safeHtmlItem[0].html);
      if (assistantContent) messages.push({ id: `gemini-assistant-${i}`, role: 'assistant', content: assistantContent, timestamp: item.time, platform: 'gemini', conversationId: convId, conversationTitle: userContent.slice(0, 50) });
    }
  }

  const sorted = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const conversations = new Set(sorted.map((m) => m.conversationId));
  return {
    messages: sorted,
    metadata: { platform: 'gemini', totalConversations: conversations.size, totalMessages: sorted.length, dateRange: { start: sorted[0]?.timestamp || '', end: sorted[sorted.length - 1]?.timestamp || '' } },
  };
}

function parsePlainText(raw: string): ParsedData {
  const lines = raw.split('\n').filter((l) => l.trim().length > 10);
  const messages: UnifiedMessage[] = lines.map((line, i) => ({ id: `text-${i}`, role: 'user' as const, content: line.trim(), timestamp: new Date().toISOString(), platform: 'other' as const, conversationId: 'imported' }));
  return { messages, metadata: { platform: 'plaintext', totalConversations: 1, totalMessages: messages.length, dateRange: { start: '', end: '' } } };
}

function detectAndParse(raw: string): ParsedData {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data[0]?.messages && data[0]?.id && data[0]?.create_time) return parseChatGPT(raw);
    if (data.conversations?.[0]?.chat_messages) return parseClaude(raw);
    if (Array.isArray(data) && data[0]?.header && data[0]?.safeHtmlItem) return parseGemini(raw);
  } catch { /* fall through */ }
  return parsePlainText(raw);
}

// ─── helpers ───

async function parseBuffer(buffer: ArrayBuffer, fileName: string): Promise<ParsedData> {
  let raw: string;

  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buffer);
    const conversationsFile = zip.file('conversations.json');
    if (conversationsFile) {
      raw = await conversationsFile.async('string');
    } else {
      const jsonFiles = Object.keys(zip.files).filter((f) => f.endsWith('.json') && !zip.files[f].dir);
      if (jsonFiles.length === 0) throw new Error('Cannot find supported JSON files within the ZIP.');
      raw = await zip.files[jsonFiles[0]].async('string');
    }
  } else {
    raw = new TextDecoder().decode(buffer);
  }

  const parsed = detectAndParse(raw);
  if (parsed.messages.length === 0) throw new Error('No parsed messages found. Please check the file format.');
  return parsed;
}

// ─── POST /parse (formData — 기존 방식) ───

parseRoute.post('/', async (c) => {
  try {
    const contentType = c.req.header('content-type') || '';

    // R2 key 방식: { key, fileName }
    if (contentType.includes('application/json')) {
      const { key, fileName } = await c.req.json<{ key: string; fileName: string }>();
      const object = await c.env.UPLOAD_BUCKET.get(key);
      if (!object) return c.json({ error: 'File not found in R2' }, 404);
      const buffer = await object.arrayBuffer();
      const name = fileName || object.customMetadata?.originalName || key;
      const parsed = await parseBuffer(buffer, name);
      return c.json({ success: true, data: parsed });
    }

    // 직접 업로드 방식 (기존)
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return c.json({ error: 'No file provided' }, 400);
    if (file.size > 50 * 1024 * 1024) return c.json({ error: 'File size exceeds 50MB.' }, 413);
    const buffer = await file.arrayBuffer();
    const parsed = await parseBuffer(buffer, file.name);
    return c.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Parse error:', error);
    return c.json({ error: 'Failed to parse file.', details: (error as Error).message }, 422);
  }
});
