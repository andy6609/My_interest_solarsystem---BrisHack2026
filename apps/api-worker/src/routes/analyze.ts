import { Hono } from 'hono';

type Bindings = {
  ANTHROPIC_API_KEY: string;
};

export const analyzeRoute = new Hono<{ Bindings: Bindings }>();

// ─── placeholder ───
// Step 1-4에서 실제 로직으로 교체됩니다.

analyzeRoute.post('/', async (c) => {
  return c.json({ error: 'Not yet implemented' }, 501);
});
