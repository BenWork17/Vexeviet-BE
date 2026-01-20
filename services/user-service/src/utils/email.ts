import nodemailer, { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(config: EmailConfig, defaultFrom: string = 'VeXeViet <noreply@vexeviet.com>') {
    this.transporter = nodemailer.createTransport(config);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // Development mode - just log, don't actually send
    if (process.env.NODE_ENV === 'development') {
      console.log(`[EMAIL] Would send to ${options.to}: ${options.subject}`);
      console.log('[EMAIL] Development mode - Email not actually sent');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`Email sent to ${options.to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Email sending failed');
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const html = `
      <h1>Xác thực tài khoản VeXeViet</h1>
      <p>Mã xác thực của bạn là: <strong>${code}</strong></p>
      <p>Mã này có hiệu lực trong 10 phút.</p>
      <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Xác thực tài khoản VeXeViet',
      html,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.WEB_URL}/reset-password?token=${resetToken}`;
    const html = `
      <h1>Đặt lại mật khẩu VeXeViet</h1>
      <p>Nhấn vào link sau để đặt lại mật khẩu:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Link này có hiệu lực trong 1 giờ.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email.</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Đặt lại mật khẩu VeXeViet',
      html,
    });
  }

  async sendBookingConfirmation(email: string, bookingCode: string): Promise<void> {
    const html = `
      <h1>Xác nhận đặt vé thành công</h1>
      <p>Mã đặt vé của bạn: <strong>${bookingCode}</strong></p>
      <p>Cảm ơn bạn đã sử dụng dịch vụ VeXeViet!</p>
    `;

    await this.sendEmail({
      to: email,
      subject: `Xác nhận đặt vé - ${bookingCode}`,
      html,
    });
  }
}

const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'mailhog',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
};

export const emailService = new EmailService(emailConfig);
