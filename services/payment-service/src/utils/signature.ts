import * as crypto from 'crypto';
import { VNPayPaymentParams, VNPayReturnParams } from '../types';
import { vnpayConfig } from '../config';

export function sortObject(obj: Record<string, unknown>): Record<string, string> {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();

  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && String(value).length > 0) {
      sorted[key] = String(value);
    }
  }

  return sorted;
}

/**
 * Encode giống Java URLEncoder.encode(value, "US-ASCII")
 * Java: space → "+"
 * Node encodeURIComponent: space → "%20"
 * VNPay sample code dùng Java → cần đổi %20 thành +
 */
function javaUrlEncode(str: string): string {
  return encodeURIComponent(str).replace(/%20/g, '+');
}

/**
 * Build query string giống Java URLEncoder.encode (space → +)
 * Dùng cho cả signData và URL query string
 */
export function buildVNPayQueryString(params: Record<string, unknown>): string {
  const sorted = sortObject(params);
  return Object.keys(sorted)
    .map((key) => `${javaUrlEncode(key)}=${javaUrlEncode(sorted[key])}`)
    .join('&');
}

/**
 * Tạo chữ ký VNPay theo đúng code mẫu Java:
 *   hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
 * 
 * Java URLEncoder.encode với US_ASCII encode space thành "+"
 */
export function createVNPaySignature(params: Omit<VNPayPaymentParams, 'vnp_SecureHash'>): string {
  const signData = buildVNPayQueryString(params as Record<string, unknown>);

  const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
  return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
}

export function verifyVNPaySignature(params: VNPayReturnParams): boolean {
  const secureHash = params.vnp_SecureHash;

  const paramsWithoutHash: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      paramsWithoutHash[key] = value;
    }
  }

  const signData = buildVNPayQueryString(paramsWithoutHash);

  const hmac = crypto.createHmac('sha512', vnpayConfig.hashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash?.toLowerCase() === signed.toLowerCase();
}

export function generateTransactionRef(): string {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VXV${timestamp}${random}`.substring(0, 30);
}

export function formatVNPayDate(date: Date): string {
  const gmt7 = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number): string => n.toString().padStart(2, '0');

  return (
    `${gmt7.getUTCFullYear()}${pad(gmt7.getUTCMonth() + 1)}${pad(gmt7.getUTCDate())}` +
    `${pad(gmt7.getUTCHours())}${pad(gmt7.getUTCMinutes())}${pad(gmt7.getUTCSeconds())}`
  );
}

export function parseVNPayDate(dateString: string): Date {
  const year = parseInt(dateString.substring(0, 4), 10);
  const month = parseInt(dateString.substring(4, 6), 10) - 1;
  const day = parseInt(dateString.substring(6, 8), 10);
  const hours = parseInt(dateString.substring(8, 10), 10);
  const minutes = parseInt(dateString.substring(10, 12), 10);
  const seconds = parseInt(dateString.substring(12, 14), 10);

  return new Date(year, month, day, hours, minutes, seconds);
}
