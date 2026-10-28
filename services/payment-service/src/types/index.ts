import {
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  TransactionStatus,
  UserRole,
} from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti: string;
}

export interface CreatePaymentRequest {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  returnUrl: string;
  cancelUrl?: string;
  orderInfo?: string;
  locale?: 'vn' | 'en';
  ipAddress: string;
  bankCode?: string;
}

export interface PaymentResponse {
  paymentId: string;
  paymentUrl: string;
  transactionId: string;
  expiredAt: Date;
}

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  vnpUrl: string;
  returnUrl: string;
  apiUrl?: string;
  version: string;
}

export interface VNPayPaymentParams {
  vnp_Version: string;
  vnp_Command: string;
  vnp_TmnCode: string;
  vnp_Locale: string;
  vnp_CurrCode: string;
  vnp_TxnRef: string;
  vnp_OrderInfo: string;
  vnp_OrderType: string;
  vnp_Amount: number;
  vnp_ReturnUrl: string;
  vnp_IpAddr: string;
  vnp_CreateDate: string;
  vnp_ExpireDate: string;
  vnp_SecureHash?: string;
}

export interface VNPayReturnParams {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate: string;
  vnp_OrderInfo: string;
  vnp_TransactionNo: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
  vnp_TxnRef: string;
  vnp_SecureHashType?: string;
  vnp_SecureHash: string;
}

export interface VNPayIPNParams extends VNPayReturnParams {}

export interface WebhookVerifyResult {
  isValid: boolean;
  paymentId?: string;
  transactionId?: string;
  status?: PaymentStatus;
  bankCode?: string;
  bankTranNo?: string;
  responseCode?: string;
  message?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
  ipAddress: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: TransactionStatus;
  message: string;
}

export interface PaymentDTO {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string | null;
  paymentUrl: string | null;
  paidAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
}

export interface PaymentStatusResponse {
  paymentId: string;
  bookingId: string;
  transactionRef: string;
  status: PaymentStatus;
  isFinal: boolean;
  paidAt: Date | null;
  expiredAt: Date | null;
}

export interface TransactionDTO {
  id: string;
  paymentId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  providerTxnId: string | null;
  bankCode: string | null;
  bankTranNo: string | null;
  responseCode: string | null;
  responseMessage: string | null;
  createdAt: Date;
}

export const VNPAY_RESPONSE_CODES: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường)',
  '09': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng chưa đăng ký dịch vụ InternetBanking',
  '10': 'Giao dịch không thành công do: Khách hàng xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  '11': 'Giao dịch không thành công do: Đã hết hạn chờ thanh toán',
  '12': 'Giao dịch không thành công do: Thẻ/Tài khoản của khách hàng bị khóa',
  '13': 'Giao dịch không thành công do: Quý khách nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Giao dịch không thành công do: Khách hàng hủy giao dịch',
  '51': 'Giao dịch không thành công do: Tài khoản của quý khách không đủ số dư để thực hiện giao dịch',
  '65': 'Giao dịch không thành công do: Tài khoản của Quý khách đã vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Giao dịch không thành công do: KH nhập sai mật khẩu thanh toán quá số lần quy định',
  '99': 'Các lỗi khác',
};

export interface IdempotencyRecord {
  key: string;
  paymentId: string;
  response: PaymentResponse;
  createdAt: Date;
  expiresAt: Date;
}

// =====================================================
// ADMIN PAYMENTS (contract Shape 2)
// =====================================================

/** Provider display label — the admin UI renders this literal string. */
export type AdminPaymentProvider = 'VNPay' | 'Momo' | 'ZaloPay' | 'BankTransfer' | 'Cash';

/** Derived from status + age at read time; never persisted. */
export type AdminPaymentRisk = 'normal' | 'watch' | 'urgent';

export interface AdminPayment {
  id: string;
  bookingCode: string;
  provider: AdminPaymentProvider;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  risk: AdminPaymentRisk;
  transactionRef: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaymentListFilters {
  status?: PaymentStatus;
  method?: PaymentMethod;
  bookingCode?: string;
  provider?: AdminPaymentProvider;
  from?: Date;
  to?: Date;
  /** Scope forced by the token for OPERATOR callers; undefined for ADMIN. */
  operatorId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LabeledCount {
  label: string;
  value: number;
}

export interface AdminPaymentSummary {
  totalCompleted: number;
  countByStatus: LabeledCount[];
  providerTrend: LabeledCount[];
  expiredCount: number;
}

// =====================================================
// ADMIN PAYMENT → BOOKING SYNC (retry + reconciliation)
// =====================================================

/** The booking transition a payment status maps to. */
export type BookingSyncAction = 'CONFIRM' | 'PAYMENT_FAILED';

/** Optional body of `POST /payments/admin/:paymentId/resync`. */
export interface ResyncBookingRequest {
  reason?: string;
}

export type BookingResyncOutcome = 'synced' | 'already_consistent' | 'failed';

/**
 * Result of an admin re-sync.
 *
 * - `synced` → the booking transition was applied (`alreadyConsistent` absent).
 * - `alreadyConsistent` → the booking was already ahead of the payment; the
 *   downstream 409 is reported as a success because there is nothing to repair.
 */
export interface BookingResyncResponse {
  synced: boolean;
  alreadyConsistent?: boolean;
  bookingStatus: BookingStatus;
}

/**
 * Closed set of reconciliation labels:
 *
 * - `BOOKING_NOT_CONFIRMED` — the payment is COMPLETED but the booking is still
 *   PENDING, i.e. the confirm never landed.
 * - `BOOKING_NOT_CANCELLED` — the payment is FAILED/CANCELLED/EXPIRED but the
 *   booking is still PENDING or CONFIRMED, i.e. the failure never propagated.
 * - `PAID_BUT_CANCELLED` — the payment is COMPLETED but the booking is
 *   CANCELLED. Money was collected for a trip that will not run and no refund
 *   was recorded, so this row needs a human refund.
 *
 * REFUNDED/PARTIALLY_REFUNDED are deliberately never a mismatch: a refund does
 * not change the booking status, so treating one as inconsistent would report
 * every legitimate refund as an error. A refund against a CANCELLED booking is
 * in fact the *correct* outcome; only COMPLETED — money still held — is
 * labelled `PAID_BUT_CANCELLED`.
 */
export type ReconciliationMismatch =
  | 'BOOKING_NOT_CONFIRMED'
  | 'BOOKING_NOT_CANCELLED'
  | 'PAID_BUT_CANCELLED';

export interface ReconciliationRow {
  paymentId: string;
  bookingId: string;
  bookingCode: string;
  provider: AdminPaymentProvider;
  method: PaymentMethod;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  mismatch: ReconciliationMismatch;
  amount: number;
  createdAt: Date;
}
