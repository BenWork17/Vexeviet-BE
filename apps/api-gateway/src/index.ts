import { config } from '@vexeviet/config';
import { API_PREFIX } from '@vexeviet/common';
import { createGatewayApp, logger } from './app';
import { services } from './config/services.config';

const app = createGatewayApp();
const PORT = config.ports.gateway;

app.listen(PORT, () => {
  logger.info(`API Gateway running on http://localhost:${PORT} (${config.nodeEnv})`);
  logger.info(`Docs: http://localhost:${PORT}/api/docs | Services: http://localhost:${PORT}/services`);
  services.forEach((s) => {
    logger.debug(`Route ${API_PREFIX}${s.prefix} -> ${s.url}`);
  });
});

export default app;
