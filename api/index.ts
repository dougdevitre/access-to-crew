/**
 * Vercel serverless entry. vercel.json rewrites every path here; Express's
 * own router takes over. Imports the compiled app (built by `npm run build`
 * during the Vercel build) so the function bundler traces plain JS.
 */
import { app } from '../apps/api/dist/app.js';

export default app;
