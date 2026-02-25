import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

export class PaymentRepository {
  async create(data: Prisma.PaymentCreateInput): Promise<Payment> {
    return prisma.payment.create({ data });
  }

  async findById(id: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        booking: true,
        transactions: true,
      },
    });
  }

  async findByTransactionRef(transactionRef: string): Promise<Payment | null> {
    return prisma.payment.findUnique({
      where: { transactionRef },
      include: {
        booking: true,
        transactions: true,
      },
    });
  }

  async findByBookingId(bookingId: string): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { bookingId },
      include: {
        transactions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    additionalData?: { paidAt?: Date; paymentUrl?: string },
    tx?: Prisma.TransactionClient
  ): Promise<Payment> {
    const client = tx || prisma;
    return client.payment.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  async findExpiredPayments(): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        expiredAt: {
          lt: new Date(),
        },
      },
    });
  }

  async markAsExpired(ids: string[]): Promise<Prisma.BatchPayload> {
    return prisma.payment.updateMany({
      where: {
        id: { in: ids },
        status: PaymentStatus.PENDING,
      },
      data: {
        status: PaymentStatus.EXPIRED,
      },
    });
  }

  async findByStatus(status: PaymentStatus, limit = 100): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { status },
      include: {
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTotalPaidByBookingId(bookingId: string): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        bookingId,
        status: PaymentStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount?.toNumber() || 0;
  }
}

export const paymentRepository = new PaymentRepository();
