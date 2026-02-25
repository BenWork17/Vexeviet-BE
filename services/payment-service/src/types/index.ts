import { PaymentStatus, PaymentMethod, TransactionType, TransactionStatus } from '@prisma/client';

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
