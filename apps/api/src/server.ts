import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadEnv } from './env.js';
import { errorHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { classifyRouter } from './routes/classify.js';

const env = loadEnv();
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' })); // photos arrive base64
app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));

app.use(healthRouter);
app.use('/v1', classifyRouter(anthropic));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT} (${env.NODE_ENV})`);
});
