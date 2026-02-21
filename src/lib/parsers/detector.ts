import type { ParsedData } from '@/types';
import { parseChatGPT } from './chatgpt';
import { parseClaude } from './claude';
import { parseGemini } from './gemini';
import { parsePlainText } from './plaintext';

export function detectPlatform(
  raw: string
): 'chatgpt' | 'claude' | 'gemini' | 'unknown' {
  try {
    const data = JSON.parse(raw);

    if (Array.isArray(data) && data[0]?.mapping) return 'chatgpt';
    if (data.conversations?.[0]?.chat_messages) return 'claude';
    if (Array.isArray(data) && data[0]?.header && data[0]?.safeHtmlItem) return 'gemini';

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function parseAuto(raw: string): ParsedData {
  const platform = detectPlatform(raw);

  switch (platform) {
    case 'chatgpt':
      return parseChatGPT(raw);
    case 'claude':
      return parseClaude(raw);
    case 'gemini':
      return parseGemini(raw);
    default:
      return parsePlainText(raw);
  }
}
