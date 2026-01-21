import { config } from '../config';

export type EventHandler<T = unknown> = (data: T) => Promise<void>;

interface ConsumerOptions {
  prefetch?: number;
  autoAck?: boolean;
}

interface MessageBrokerConnection {
  isConnected: boolean;
}

export class EventConsumer {
  private connection: MessageBrokerConnection | null = null;
  private handlers: Map<string, EventHandler[]> = new Map();
  private isConnecting: boolean = false;

  async connect(): Promise<void> {
    if (this.connection?.isConnected) {
      return;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isConnecting = true;

    try {
      console.log('📡 Consumer connecting to RabbitMQ...');
      
      // Dynamic import to avoid type issues at compile time
      const amqp = await import('amqplib');
      const conn = await amqp.connect(config.rabbitmq.url);
      const channel = await conn.createChannel();

      // Set prefetch to process one message at a time
      await channel.prefetch(1);

      // Store connection state
      this.connection = { isConnected: true };
      
      // Handle connection errors
      conn.on('error', (err: Error) => {
        console.error('🔴 Consumer RabbitMQ error:', err.message);
      });

      conn.on('close', () => {
        console.warn('🔴 Consumer RabbitMQ connection closed');
      });

      // Store channel for consuming
      (this as Record<string, unknown>)._channel = channel;

      console.log('✅ Consumer connected to RabbitMQ');
    } catch (error) {
      console.error('🔴 Consumer failed to connect to RabbitMQ:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Subscribe to a queue
   */
  async subscribe<T>(
    queue: string,
    handler: EventHandler<T>,
    options: ConsumerOptions = {}
  ): Promise<void> {
    if (!this.connection?.isConnected) {
      await this.connect();
    }

    const channel = (this as Record<string, unknown>)._channel as {
      assertQueue: (queue: string, options: object) => Promise<unknown>;
      consume: (queue: string, callback: (msg: { content: Buffer } | null) => void, options: object) => Promise<unknown>;
      ack: (msg: { content: Buffer }) => void;
      nack: (msg: { content: Buffer }, allUpTo: boolean, requeue: boolean) => void;
    } | null;

    if (!channel) {
      throw new Error('Cannot subscribe: No RabbitMQ channel available');
    }

    // Store handler
    const handlers = this.handlers.get(queue) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(queue, handlers);

    // Ensure queue exists
    await channel.assertQueue(queue, { durable: true });

    // Start consuming
    await channel.consume(
      queue,
      (msg) => {
        if (!msg) return;

        // Handle async processing without returning promise to consume callback
        void (async (): Promise<void> => {
          try {
            const data = JSON.parse(msg.content.toString()) as T;
            console.log(`📥 Received event from [${queue}]:`, data);

            // Call all handlers for this queue
            const queueHandlers = this.handlers.get(queue) || [];
            for (const h of queueHandlers) {
              await h(data);
            }

            // Acknowledge message
            if (!options.autoAck && channel) {
              channel.ack(msg);
            }
          } catch (error) {
            console.error(`🔴 Error processing message from [${queue}]:`, error);
            
            // Negative acknowledge - requeue the message
            if (!options.autoAck && channel) {
              channel.nack(msg, false, true);
            }
          }
        })();
      },
      { noAck: options.autoAck || false }
    );

    console.log(`✅ Subscribed to queue: ${queue}`);
  }

  async close(): Promise<void> {
    try {
      const channel = (this as Record<string, unknown>)._channel as { close: () => Promise<void> } | null;
      if (channel) {
        await channel.close();
      }
      console.log('✅ Consumer RabbitMQ connection closed');
    } catch (error) {
      console.error('🔴 Error closing consumer RabbitMQ connection:', error);
    } finally {
      this.connection = null;
      (this as Record<string, unknown>)._channel = null;
    }
  }
}

// Singleton instance
export const eventConsumer = new EventConsumer();
