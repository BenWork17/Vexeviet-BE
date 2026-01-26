import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { SeatService } from './services/seat.service';

const app: Application = express();
const seatService = new SeatService();

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

  // Start cleanup job for expired seat holds
  setInterval(async () => {
    try {
      const cleanedCount = await seatService.cleanupExpiredHolds();
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired seat holds`);
      }
    } catch (error) {
      console.error('❌ Error in seat cleanup job:', error);
    }
  }, 60000); // Run every 60 seconds
});

export default app;
