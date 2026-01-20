export interface SMSConfig {
  provider: 'twilio' | 'nexmo' | 'local';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SMSOptions {
  to: string;
  message: string;
}

export class SMSService {
  private config: SMSConfig;

  constructor(config: SMSConfig) {
    this.config = config;
  }

  sendSMS(options: SMSOptions): void {
    console.log(`[SMS] Sending to ${options.to}: ${options.message}`);

    if (this.config.provider === 'local' || process.env.NODE_ENV === 'development') {
      console.log('[SMS] Development mode - SMS not actually sent');
      return;
    }

    throw new Error('SMS provider not configured');
  }

  sendVerificationSMS(phone: string, code: string): void {
    const message = `Ma xac thuc VeXeViet cua ban la: ${code}. Ma nay co hieu luc trong 10 phut.`;
    
    this.sendSMS({
      to: phone,
      message,
    });
  }

  sendBookingConfirmationSMS(phone: string, bookingCode: string): void {
    const message = `VeXeViet: Dat ve thanh cong. Ma dat ve: ${bookingCode}`;
    
    this.sendSMS({
      to: phone,
      message,
    });
  }

  sendBookingReminderSMS(phone: string, departureTime: string): void {
    const message = `VeXeViet: Nhac nho chuyen xe cua ban khoi hanh luc ${departureTime}. Chuc ban mot chuyen di tot lanh!`;
    
    this.sendSMS({
      to: phone,
      message,
    });
  }
}

const smsConfig: SMSConfig = {
  provider: (process.env.SMS_PROVIDER as 'twilio' | 'nexmo' | 'local') || 'local',
  accountSid: process.env.SMS_ACCOUNT_SID,
  authToken: process.env.SMS_AUTH_TOKEN,
  fromNumber: process.env.SMS_FROM_NUMBER,
};

export const smsService = new SMSService(smsConfig);
