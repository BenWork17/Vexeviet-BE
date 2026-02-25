import { PaymentStatus, TransactionStatus, TransactionType, Prisma } from '@prisma/client';
import { vnpayConfig, paymentConfig } from '../config';
import prisma from '../config/database';
import {
  VNPayPaymentParams,
  VNPayReturnParams,
  VNPayIPNParams,
  WebhookVerifyResult,
  VNPAY_RESPONSE_CODES,
} from '../types';
import {
  createVNPaySignature,
  verifyVNPaySignature,
  formatVNPayDate,
  buildVNPayQueryString,
} from '../utils/signature';
import { paymentRepository } from '../repositories/payment.repository';

export class VNPayService {
  createPaymentUrl(
    _paymentId: string,
    transactionRef: string,
    amount: number,
    orderInfo: string,
    ipAddress: string,
    locale: 'vn' | 'en' = 'vn',
    returnUrl?: string,
    bankCode?: string
  ): string {
    const createDate = new Date();
    const expireDate = new Date(createDate.getTime() + paymentConfig.paymentExpireMinutes * 60 * 1000);

    // Fix: IPv6 localhost → IPv4 (VNPay yêu cầu IPv4)
    let validIp = ipAddress;
    if (validIp === '::1' || validIp === '::ffff:127.0.0.1' || validIp === '0:0:0:0:0:0:0:1') {
      validIp = '127.0.0.1';
    } else if (validIp.startsWith('::ffff:')) {
      validIp = validIp.replace('::ffff:', '');
    }

    const params: Record<string, string | number> = {
      vnp_Version: vnpayConfig.version,
      vnp_Command: 'pay',
      vnp_TmnCode: vnpayConfig.tmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: transactionRef,
      vnp_OrderInfo: orderInfo || `Thanh toan ve xe ${transactionRef}`,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(amount * 100), // Fix: đảm bảo là số nguyên, tránh float
      vnp_ReturnUrl: returnUrl || vnpayConfig.returnUrl,
      vnp_IpAddr: validIp,
      vnp_CreateDate: formatVNPayDate(createDate),
      vnp_ExpireDate: formatVNPayDate(expireDate),
    };

    // KHÔNG gửi vnp_BankCode → VNPay sẽ hiển thị trang cho user tự chọn ngân hàng
    // Tránh lỗi "Ngân hàng không hỗ trợ" khi merchant chưa được bật phương thức đó
    if (bankCode && bankCode.trim() !== '') {
      params.vnp_BankCode = bankCode;
    }

    const secureHash = createVNPaySignature(params as unknown as Omit<VNPayPaymentParams, 'vnp_SecureHash'>);

    // Dùng Java-style URL encoding (space → +) giống code mẫu VNPay
    const queryString = buildVNPayQueryString(params);
    const paymentUrl = `${vnpayConfig.vnpUrl}?${queryString}&vnp_SecureHash=${secureHash}`;

    console.log('=== VNPay Debug ===');
    console.log('TMN Code:', vnpayConfig.tmnCode);
    console.log('Hash Secret (first 8 chars):', vnpayConfig.hashSecret.substring(0, 8) + '...');
    console.log('Bank Code:', bankCode || '(none - VNPay will show bank selector)');
    console.log('Amount (VND):', amount, '→ VNPay Amount:', Math.round(amount * 100));
    console.log('IP Address:', validIp);
    console.log('Payment URL:', paymentUrl);
    console.log('===================');

    return paymentUrl;
  }

  verifyReturnUrl(params: VNPayReturnParams): WebhookVerifyResult {
    const isValid = verifyVNPaySignature(params);

    if (!isValid) {
      return {
        isValid: false,
        message: 'Invalid signature',
      };
    }

    const responseCode = params.vnp_ResponseCode;
    const transactionStatus = params.vnp_TransactionStatus;

    let status: PaymentStatus;
    if (responseCode === '00' && transactionStatus === '00') {
      status = PaymentStatus.COMPLETED;
    } else if (responseCode === '24') {
      status = PaymentStatus.CANCELLED;
    } else {
      status = PaymentStatus.FAILED;
    }

    return {
      isValid: true,
      paymentId: params.vnp_TxnRef,
      transactionId: params.vnp_TransactionNo,
      status,
      bankCode: params.vnp_BankCode,
      bankTranNo: params.vnp_BankTranNo,
      responseCode,
      message: VNPAY_RESPONSE_CODES[responseCode] || 'Unknown error',
    };
  }

  async handleIPN(params: VNPayIPNParams): Promise<{ rspCode: string; message: string }> {
    const isValid = verifyVNPaySignature(params);

    if (!isValid) {
      return { rspCode: '97', message: 'Invalid signature' };
    }

    const transactionRef = params.vnp_TxnRef;
    const payment = await paymentRepository.findByTransactionRef(transactionRef);

    if (!payment) {
      return { rspCode: '01', message: 'Order not found' };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      return { rspCode: '02', message: 'Order already processed' };
    }

    const vnpAmount = parseInt(params.vnp_Amount, 10) / 100;
    if (vnpAmount !== payment.amount.toNumber()) {
      return { rspCode: '04', message: 'Invalid amount' };
    }

    const responseCode = params.vnp_ResponseCode;
    const transactionStatus = params.vnp_TransactionStatus;

    let newStatus: PaymentStatus;
    let transactionTxStatus: TransactionStatus;

    if (responseCode === '00' && transactionStatus === '00') {
      newStatus = PaymentStatus.COMPLETED;
      transactionTxStatus = TransactionStatus.COMPLETED;
    } else if (responseCode === '24') {
      newStatus = PaymentStatus.CANCELLED;
      transactionTxStatus = TransactionStatus.CANCELLED;
    } else {
      newStatus = PaymentStatus.FAILED;
      transactionTxStatus = TransactionStatus.FAILED;
    }

    await prisma.$transaction(async (tx) => {
      await paymentRepository.updateStatus(
        payment.id,
        newStatus,
        {
          paidAt: newStatus === PaymentStatus.COMPLETED ? new Date() : undefined,
        },
        tx
      );

      await tx.transaction.create({
        data: {
          payment: { connect: { id: payment.id } },
          type: TransactionType.PAYMENT,
          amount: new Prisma.Decimal(vnpAmount),
          status: transactionTxStatus,
          providerTxnId: params.vnp_TransactionNo,
          bankCode: params.vnp_BankCode,
          bankTranNo: params.vnp_BankTranNo || null,
          responseCode: responseCode,
          responseMessage: VNPAY_RESPONSE_CODES[responseCode] || 'Unknown',
        },
      });
    });

    if (newStatus === PaymentStatus.COMPLETED) {
      console.log(`✅ Payment ${payment.id} completed successfully`);
    }

    return { rspCode: '00', message: 'Confirm Success' };
  }

  async queryTransaction(transactionRef: string, transactionDate: string): Promise<unknown> {
    console.log(`Querying transaction: ${transactionRef}, date: ${transactionDate}`);
    return {
      message: 'Query transaction not implemented in sandbox',
      transactionRef,
      transactionDate,
    };
  }
}

export const vnpayService = new VNPayService();
