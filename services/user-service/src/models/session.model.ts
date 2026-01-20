import { RefreshToken as PrismaRefreshToken } from '@prisma/client';

export interface SessionModel {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateSessionDTO {
  userId: string;
  token: string;
  expiresAt: Date;
}

export interface SessionResponse {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export function toSessionResponse(session: PrismaRefreshToken): SessionResponse {
  return {
    id: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}
