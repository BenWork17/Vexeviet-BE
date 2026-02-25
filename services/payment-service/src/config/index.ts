import { VNPayConfig } from '../types';

export const paymentConfig = {
  port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  paymentExpireMinutes: 15,
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  idempotency: {
    ttlSeconds: 24 * 60 * 60,
  },
};

export const vnpayConfig: VNPayConfig = {
  tmnCode: (process.env.VNPAY_TMN_CODE || '').trim(),
  hashSecret: (process.env.VNPAY_HASH_SECRET || '').trim(),
  vnpUrl: (process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim(),
  returnUrl: (process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/result').trim(),
  apiUrl: (process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction').trim(),
  version: '2.1.0',
};

export const getVNPayConfig = (): VNPayConfig => {
  if (!vnpayConfig.tmnCode || !vnpayConfig.hashSecret) {
    throw new Error(
      'VNPay TMN_CODE and HASH_SECRET are required. ' +
      'Set VNPAY_TMN_CODE and VNPAY_HASH_SECRET in your .env file. ' +
      'Get sandbox credentials from https://sandbox.vnpayment.vn/apis/vnpay-demo/'
    );
  }
  return vnpayConfig;
};
