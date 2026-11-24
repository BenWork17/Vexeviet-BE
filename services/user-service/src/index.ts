import { config } from '@vexeviet/config';
import { createUserApp, logger } from './app';

const app = createUserApp();
const PORT = config.ports.user;

app.listen(PORT, () => {
  logger.info(`User service running on http://localhost:${PORT} (${config.nodeEnv})`);
});

export default app;
