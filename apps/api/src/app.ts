import Anthropic from '@anthropic-ai/sdk';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './env.js';
import { errorHandler } from './middleware/error.js';
import { healthRouter } from './routes/health.js';
import { classifyRouter } from './routes/classify.js';

export const config = loadConfig();

const anthropic = config.anthropicApiKey ? new Anthropic({ apiKey: config.anthropicApiKey }) : null;

export const app = express();

app.disable('x-powered-by');
// Behind Vercel / a load balancer: trust the first proxy hop so the rate
// limiter keys on real client IPs, not the proxy's.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
// Photos arrive base64. Vercel caps request bodies at ~4.5 MB regardless;
// larger payloads await the S3 presigned-upload path.
app.use(express.json({ limit: '4mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }));

app.use(healthRouter(config));
app.use('/v1', classifyRouter(config, anthropic));

app.use(errorHandler);
