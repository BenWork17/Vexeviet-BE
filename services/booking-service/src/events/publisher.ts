import { config } from '../config';

// Since amqplib types are problematic, we'll use a simplified event interface
// This can be enhanced later with proper RabbitMQ integration

export type EventHandler<T = unknown> = (data: T) => Promise<void>;

interface MessageBrokerConnection {
  isConnected: boolean;
}

export class EventPublisher {
  private connection: MessageBrokerConnection | null = null;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

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
      console.log('📡 Connecting to RabbitMQ...');
      
      // Dynamic import to avoid type issues at compile time
      const amqp = await import('amqplib');
      const conn = await amqp.connect(config.rabbitmq.url);
      const channel = await conn.createChannel();

      // Setup exchanges
      await channel.assertExchange(
        config.rabbitmq.exchanges.booking,
        'topic',
        { durable: true }
      );

      // Setup queues
      const queues = Object.values(config.rabbitmq.queues);
      for (const queue of queues) {
        await channel.assertQueue(queue, { durable: true });
      }

      // Bind queues to exchange
      await channel.bindQueue(
        config.rabbitmq.queues.bookingCreated,
        config.rabbitmq.exchanges.booking,
        'booking.created'
      );
      await channel.bindQueue(
        config.rabbitmq.queues.bookingConfirmed,
        config.rabbitmq.exchanges.booking,
        'booking.confirmed'
      );
      await channel.bindQueue(
        config.rabbitmq.queues.bookingCancelled,
        config.rabbitmq.exchanges.booking,
        'booking.cancelled'
      );
      await channel.bindQueue(
        config.rabbitmq.queues.seatReserved,
        config.rabbitmq.exchanges.booking,
        'seat.reserved'
      );
      await channel.bindQueue(
        config.rabbitmq.queues.seatReleased,
        config.rabbitmq.exchanges.booking,
        'seat.released'
      );

      // Store connection state
      this.connection = { isConnected: true };
      
      // Handle connection errors
      conn.on('error', (err: Error) => {
        console.error('🔴 RabbitMQ connection error:', err.message);
        this.handleDisconnect();
      });

      conn.on('close', () => {
        console.warn('🔴 RabbitMQ connection closed');
        this.handleDisconnect();
      });

      // Store channel for publishing
      (this as Record<string, unknown>)._channel = channel;

      this.reconnectAttempts = 0;
      console.log('✅ Connected to RabbitMQ');
    } catch (error) {
      console.error('🔴 Failed to connect to RabbitMQ:', error);
      this.handleDisconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private handleDisconnect(): void {
    this.connection = null;
    (this as Record<string, unknown>)._channel = null;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`🔄 Reconnecting to RabbitMQ in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('🔴 Max reconnect attempts reached. RabbitMQ connection failed.');
    }
  }

  async publish<T>(routingKey: string, data: T): Promise<boolean> {
    try {
      if (!this.connection?.isConnected) {
        await this.connect();
      }

      const channel = (this as Record<string, unknown>)._channel as {
        publish: (exchange: string, routingKey: string, content: Buffer, options: object) => boolean;
      } | null;

      if (!channel) {
        console.error('🔴 Cannot publish: No RabbitMQ channel available');
        return false;
      }

      const message = JSON.stringify(data);
      const result = channel.publish(
        config.rabbitmq.exchanges.booking,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now(),
        }
      );

      console.log(`📤 Published event [${routingKey}]:`, data);
      return result;
    } catch (error) {
      console.error(`🔴 Failed to publish event [${routingKey}]:`, error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      const channel = (this as Record<string, unknown>)._channel as { close: () => Promise<void> } | null;
      if (channel) {
        await channel.close();
      }
      console.log('✅ RabbitMQ connection closed');
    } catch (error) {
      console.error('🔴 Error closing RabbitMQ connection:', error);
    } finally {
      this.connection = null;
      (this as Record<string, unknown>)._channel = null;
    }
  }
}

// Singleton instance
export const eventPublisher = new EventPublisher();
