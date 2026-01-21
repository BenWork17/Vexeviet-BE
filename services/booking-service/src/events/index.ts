export { eventPublisher, EventPublisher } from './publisher';
export { eventConsumer, EventConsumer } from './consumer';
export type { EventHandler } from './consumer';
export { BookingEvents, SeatEvents } from './booking.events';
export type {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  SeatReservedEvent,
  SeatReleasedEvent,
} from './booking.events';
