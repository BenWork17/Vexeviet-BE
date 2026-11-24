import { paymentConfig } from './config';
import { createPaymentApp, logger } from './app';
import { connectRedis } from './utils/idempotency';

const app = createPaymentApp();
const PORT = paymentConfig.port;

const startServer = async (): Promise<void> => {
  await connectRedis();

  app.listen(PORT, () => {
    logger.info(`Payment service running on http://localhost:${PORT} (${paymentConfig.nodeEnv})`);
  });
};

startServer().catch((err: unknown) => {
  logger.error('Failed to start payment service', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

export default app;
