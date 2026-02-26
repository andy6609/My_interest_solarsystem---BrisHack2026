import { Hono } from 'hono';

export const parseRoute = new Hono();

// ─── placeholder ───
// Step 1-5에서 실제 로직으로 교체됩니다.

parseRoute.post('/', async (c) => {
  return c.json({ error: 'Not yet implemented' }, 501);
});
