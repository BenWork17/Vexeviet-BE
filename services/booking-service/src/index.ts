import { config } from './config';
import { createBookingApp, logger } from './app';
import { SeatService } from './services/seat.service';

const app = createBookingApp();
const seatService = new SeatService();
const PORT = config.service.port;

app.listen(PORT, () => {
  logger.info(`Booking service running on http://localhost:${PORT} (${config.service.env})`);

  setInterval(async () => {
    try {
      const cleanedCount = await seatService.cleanupExpiredHolds();
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} expired seat holds`);
      }
    } catch (error) {
      logger.error('Error in seat cleanup job', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, 60000);
});

export default app;
