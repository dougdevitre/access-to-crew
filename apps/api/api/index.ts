/**
 * Vercel serverless entry. The Vercel project's root directory is apps/api;
 * vercel.json rewrites every path here and Express's router takes over.
 * Imports the compiled app (built by `npm run build` during the Vercel
 * build) so the function bundler traces plain JS.
 */
import { app } from '../dist/app.js';

export default app;
