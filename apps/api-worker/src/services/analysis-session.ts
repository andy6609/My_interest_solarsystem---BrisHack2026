export interface SessionState {
  sessionId: string;
  status: 'idle' | 'quick_done' | 'refining' | 'merging' | 'done' | 'error';
  quickResult: any | null;
  allQuestions: string[];
  chunkTrees: any[];
  totalChunks: number;
  completedChunks: number;
  finalResult: any | null;
  planetCount: number;
  error: string | null;
}

export class AnalysisSession {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/start' && request.method === 'POST') return this.handleStart(request);
    if (path === '/status' && request.method === 'GET') return this.handleStatus();
    return new Response('Not found', { status: 404 });
  }

  private async handleStart(request: Request): Promise<Response> {
    const body = await request.json() as any;
    const { questions, planetCount, quickResult } = body;

    const session: SessionState = {
      sessionId: crypto.randomUUID(),
      quickResult,
      allQuestions: questions,
      planetCount,
      chunkTrees: [],
      completedChunks: 0,
      totalChunks: Math.ceil(questions.length / 200),
      status: 'refining',
      finalResult: null,
      error: null,
    };

    await this.state.storage.put('session', session);
    await this.state.storage.setAlarm(Date.now() + 15_000);

    return new Response(JSON.stringify({
      sessionId: session.sessionId,
      status: 'refining',
      totalChunks: session.totalChunks,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  private async handleStatus(): Promise<Response> {
    const stored = await this.state.storage.get('session') as SessionState | null;
    if (!stored) return new Response(JSON.stringify({ status: 'idle' }), { headers: { 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({
      status: stored.status,
      completedChunks: stored.completedChunks,
      totalChunks: stored.totalChunks,
      progress: stored.totalChunks > 0
        ? Math.round((stored.completedChunks / stored.totalChunks) * 80)
        : 0,
      finalResult: stored.finalResult,
      error: stored.error,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  async alarm(): Promise<void> {
    const session = await this.state.storage.get('session') as SessionState | null;
    if (!session || session.status === 'done' || session.status === 'error') return;

    try {
      const chunkSize = 200;
      const start = session.completedChunks * chunkSize;
      const chunk = session.allQuestions.slice(start, start + chunkSize);

      if (chunk.length === 0) {
        session.status = 'merging';
        await this.state.storage.put('session', session);

        const mergeResult = await this.callClaude(this.buildMergePrompt(session.chunkTrees, session.planetCount, session.allQuestions.length));
        session.finalResult = mergeResult;
        session.status = 'done';
        await this.state.storage.put('session', session);
        return;
      }

      const chunkTree = await this.callClaude(this.buildChunkPrompt(chunk));
      session.chunkTrees.push(chunkTree);
      session.completedChunks++;
      await this.state.storage.put('session', session);

      const delay = session.completedChunks < session.totalChunks ? 15_000 : 1_000;
      await this.state.storage.setAlarm(Date.now() + delay);
    } catch (err: any) {
      if (err.message === 'Rate limited, will retry') return;
      session.status = 'error';
      session.error = err.message;
      await this.state.storage.put('session', session);
    }
  }

  private async callClaude(prompt: string): Promise<any> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) {
        await this.state.storage.setAlarm(Date.now() + 30_000);
        throw new Error('Rate limited, will retry');
      }
      throw new Error(`Claude API ${res.status}`);
    }

    const data = await res.json() as { content: { type: string; text: string }[] };
    const text = data.content[0].text;
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed.tree || parsed;
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Failed to parse Claude response');
    }
  }

  private buildChunkPrompt(questions: string[]): string {
    const truncated = questions.map(q => q.length > 80 ? q.slice(0, 80) + '…' : q).filter(q => q.length > 10);
    return `You are classifying questions into a HIERARCHICAL category tree.

Create a 2-level hierarchy:
- Level 1: 4-5 BROAD categories
- Level 2: Each Level 1 category splits into 2-4 SPECIFIC sub-categories

QUESTIONS:
${truncated.map((q, i) => `[${i}] ${q}`).join('\n')}

Respond in EXACT JSON format (no markdown, no code fences):
{"tree": [{"name": "...", "description": "...", "questionIndices": [], "representativeQuestions": [], "subTopics": [], "recentActivityScore": 0.8, "growthTrend": "rising", "children": []}]}`;
  }

  private buildMergePrompt(chunkTrees: any[], planetCount: number, totalQuestions: number): string {
    return `Merge these category trees into a single coherent 2-level hierarchy (4-5 broad, 12-15 total leaves).

Batches:
${chunkTrees.map((tree, i) => `Batch ${i + 1}: ${Array.isArray(tree) ? tree.map((n: any) => n.name).join(', ') : JSON.stringify(tree)}`).join('\n')}

Total questions: ${totalQuestions}, target planets: ${planetCount}

Respond in EXACT JSON format (no markdown, no code fences):
{"tree": [{"name": "...", "description": "...", "questionIndices": [], "representativeQuestions": [], "subTopics": [], "recentActivityScore": 0.8, "growthTrend": "rising", "children": []}]}`;
  }
}
