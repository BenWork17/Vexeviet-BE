import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { connectRedis } from './utils/idempotency';
import { paymentConfig } from './config';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', true);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({
    status: 'ready',
    service: 'payment-service',
  });
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = paymentConfig.port;

const startServer = async (): Promise<void> => {
  try {
    await connectRedis();
  } catch (error) {
    console.warn('⚠️ Redis connection failed, continuing without idempotency:', error);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Payment service running on port ${PORT}`);
    console.log(`📝 Environment: ${paymentConfig.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`💳 VNPay sandbox: enabled`);
  });
};

startServer();
