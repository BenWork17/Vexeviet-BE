import type { Request } from 'express';

export type SharedUserRole = 'CUSTOMER' | 'OPERATOR' | 'ADMIN';

export interface SharedTokenPayload {
  userId: string;
  email: string;
  role: SharedUserRole;
}

export interface SharedAuthRequest extends Request {
  user?: SharedTokenPayload;
  requestId?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: ApiErrorPayload;
  requestId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  message?: string;
  requestId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
