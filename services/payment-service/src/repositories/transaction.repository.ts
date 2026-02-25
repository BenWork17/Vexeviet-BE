import { Transaction, TransactionType, TransactionStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

export class TransactionRepository {
  async create(
    data: Prisma.TransactionCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    const client = tx || prisma;
    return client.transaction.create({ data });
  }

  async findById(id: string): Promise<Transaction | null> {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    });
  }

  async findByPaymentId(paymentId: string): Promise<Transaction[]> {
    return prisma.transaction.findMany({
      where: { paymentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByProviderTxnId(providerTxnId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { providerTxnId },
      include: {
        payment: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    additionalData?: { providerTxnId?: string; bankCode?: string; bankTranNo?: string; responseCode?: string; responseMessage?: string },
    tx?: Prisma.TransactionClient
  ): Promise<Transaction> {
    const client = tx || prisma;
    return client.transaction.update({
      where: { id },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  async createRefundTransaction(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<Transaction> {
    return prisma.transaction.create({
      data: {
        payment: { connect: { id: paymentId } },
        type: TransactionType.REFUND,
        amount: new Prisma.Decimal(amount),
        status: TransactionStatus.PENDING,
        metadata: { reason },
      },
    });
  }

  async getRefundedAmount(paymentId: string): Promise<number> {
    const result = await prisma.transaction.aggregate({
      where: {
        paymentId,
        type: TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
      },
      _sum: {
        amount: true,
      },
    });
    return result._sum.amount?.toNumber() || 0;
  }
}

export const transactionRepository = new TransactionRepository();
