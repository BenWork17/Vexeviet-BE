import { UserEvent } from './user.events';

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
    console.log('[Event] Publishing event:', {
      type: event.type,
      userId: event.userId,
      timestamp: event.timestamp,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[Event] Development mode - Event not sent to Kafka');
      console.log('[Event] Event data:', JSON.stringify(event.data, null, 2));
      return;
    }

    throw new Error('Kafka integration not implemented yet. Coming in Iteration 1-3.');
  }

  public publishBatch(events: UserEvent[]): void {
    console.log(`[Event] Publishing ${events.length} events in batch`);
    
    for (const event of events) {
      this.publish(event);
    }
  }
}

export const eventPublisher = EventPublisher.getInstance();
