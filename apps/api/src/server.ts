import { app, config } from './app.js';

const server = app.listen(config.port, () => {
  console.log(`api listening on :${config.port} (${config.nodeEnv})`);
});

// Finish in-flight requests on SIGTERM/SIGINT instead of dropping them.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
