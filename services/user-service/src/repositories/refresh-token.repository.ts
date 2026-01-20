import { prisma } from '@vexeviet/database';
import { RefreshToken, Prisma, User } from '@prisma/client';

export type RefreshTokenWithUser = RefreshToken & { user: User };

export class RefreshTokenRepository {
  async create(data: Prisma.RefreshTokenCreateInput): Promise<RefreshToken> {
    return prisma.refreshToken.create({ data });
  }

  async findByToken(token: string): Promise<RefreshTokenWithUser | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteByToken(token: string): Promise<RefreshToken | null> {
    try {
      return await prisma.refreshToken.delete({
        where: { token },
      });
    } catch {
      return null;
    }
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { userId },
    });
    return result.count;
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }
}
