import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { analyzeRoute } from './routes/analyze';
import { parseRoute } from './routes/parse';
import { uploadRoute } from './routes/upload';
import { AnalysisSession } from './services/analysis-session';

export { AnalysisSession };

type Bindings = {
  ANTHROPIC_API_KEY: string;
  ANALYSIS_CACHE: KVNamespace;
  ANALYSIS_SESSION: DurableObjectNamespace;
  UPLOAD_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: ['https://chatuniverse.pages.dev', 'https://my-interest-solarsystem---brishack2026.pages.dev', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

app.route('/analyze', analyzeRoute);
app.route('/parse', parseRoute);
app.route('/upload', uploadRoute);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
