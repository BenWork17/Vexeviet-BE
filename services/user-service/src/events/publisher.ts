import { createLogger } from '@vexeviet/common';
import { UserEvent } from './user.events';

const logger = createLogger('user-service:events');

export class EventPublisher {
  private static instance: EventPublisher;

  private constructor() {}

  public static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  public publish(event: UserEvent): void {
    logger.info(`Domain event emitted: ${event.type}`, {
      userId: event.userId,
      timestamp: event.timestamp,
    });
  }

  public publishBatch(events: UserEvent[]): void {
    for (const event of events) {
      this.publish(event);
    }
  }
}

export const eventPublisher = EventPublisher.getInstance();
