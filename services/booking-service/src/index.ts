import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: config.service.name,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Ready check endpoint (for Kubernetes)
app.get('/ready', (_req, res) => {
  // TODO: Add database and Redis connectivity checks
  res.json({
    status: 'ready',
    service: config.service.name,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.service.port;

app.listen(PORT, () => {
  console.log(`🚀 Booking service running on port ${PORT}`);
  console.log(`📝 Environment: ${config.service.env}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Bookings API: http://localhost:${PORT}/api/v1/bookings`);
  console.log(`💺 Seats API: http://localhost:${PORT}/api/v1/seats`);
});

export default app;
