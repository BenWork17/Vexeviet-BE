import { Request, Response } from 'express';
import { vnpayService } from '../services/vnpay.service';
import { VNPayReturnParams, VNPayIPNParams } from '../types';

// URL frontend để hiển thị kết quả thanh toán
const FRONTEND_PAYMENT_RESULT_URL = process.env.FRONTEND_PAYMENT_RESULT_URL || 'http://localhost:8081/payment/result';

export class WebhookController {
  vnpayReturn = async (req: Request, res: Response): Promise<void> => {
    try {
      const params = req.query as unknown as VNPayReturnParams;
      console.log('VNPay Return Params:', JSON.stringify(params, null, 2));
      const result = vnpayService.verifyReturnUrl(params);

      // Tạo query params để gửi đến frontend
      const queryParams = new URLSearchParams();
      
      if (!result.isValid) {
        queryParams.set('success', 'false');
        queryParams.set('error', result.message || 'Invalid signature');
        queryParams.set('code', 'INVALID_SIGNATURE');
      } else {
        queryParams.set('success', result.status === 'COMPLETED' ? 'true' : 'false');
        queryParams.set('status', result.status || 'UNKNOWN');
        queryParams.set('paymentId', result.paymentId || '');
        queryParams.set('transactionId', result.transactionId || '');
        queryParams.set('bankCode', result.bankCode || '');
        queryParams.set('message', result.message || '');
        queryParams.set('responseCode', result.responseCode || '');
      }

      // Redirect đến trang kết quả thanh toán trên frontend
      const redirectUrl = `${FRONTEND_PAYMENT_RESULT_URL}?${queryParams.toString()}`;
      console.log('Redirecting to frontend:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('VNPay Return error:', error);
      
      // Redirect đến frontend với thông báo lỗi
      const queryParams = new URLSearchParams();
      queryParams.set('success', 'false');
      queryParams.set('error', error instanceof Error ? error.message : 'Failed to verify payment');
      queryParams.set('code', 'VERIFICATION_ERROR');
      
      const redirectUrl = `${FRONTEND_PAYMENT_RESULT_URL}?${queryParams.toString()}`;
      res.redirect(redirectUrl);
    }
  };

  vnpayIPN = async (req: Request, res: Response): Promise<void> => {
    try {
      const params = req.query as unknown as VNPayIPNParams;
      const result = await vnpayService.handleIPN(params);

      res.status(200).json({
        RspCode: result.rspCode,
        Message: result.message,
      });
    } catch (error) {
      console.error('VNPay IPN error:', error);
      res.status(200).json({
        RspCode: '99',
        Message: 'Unknown error',
      });
    }
  };

  momoWebhook = async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'Momo webhook not implemented yet',
    });
  };

  zalopayWebhook = async (_req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'ZaloPay webhook not implemented yet',
    });
  };
}

export const webhookController = new WebhookController();
