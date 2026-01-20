import express, { Application } from 'express';
import cors from 'cors';
import { config } from '@vexeviet/config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'route-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.ROUTE_SERVICE_PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Route service running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Routes API: http://localhost:${PORT}/api/v1/routes`);
  console.log(`🔍 Search API: http://localhost:${PORT}/api/v1/search/routes`);
});

export default app;
