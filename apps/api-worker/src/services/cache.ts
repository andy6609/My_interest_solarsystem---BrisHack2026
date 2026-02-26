export class AnalysisCache {
  constructor(private kv: KVNamespace) {}

  async generateKey(questions: string[]): Promise<string> {
    const sorted = [...questions].sort().join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(sorted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `analysis:${hashHex}`;
  }

  async get(key: string): Promise<any | null> {
    return await this.kv.get(key, 'json');
  }

  async set(key: string, value: any, ttlSeconds = 604800): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttlSeconds,
    });
  }
}
