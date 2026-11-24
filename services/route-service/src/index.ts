import { config } from '@vexeviet/config';
import { createRouteApp, logger } from './app';

const app = createRouteApp();
const PORT = config.ports.route;

app.listen(PORT, () => {
  logger.info(`Route service running on http://localhost:${PORT} (${config.nodeEnv})`);
});

export default app;
