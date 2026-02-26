import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeRoute } from './routes/analyze';
import { parseRoute } from './routes/parse';

type Bindings = {
  ANTHROPIC_API_KEY: string;
  // Phase 2에서 추가: ANALYSIS_CACHE: KVNamespace;
  // Phase 3에서 추가: ANALYSIS_SESSION: DurableObjectNamespace;
  // Phase 4에서 추가: UPLOAD_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: ['https://chatuniverse.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.route('/analyze', analyzeRoute);
app.route('/parse', parseRoute);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
