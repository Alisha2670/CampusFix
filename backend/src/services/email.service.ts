import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '../config/env.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initialize or retrieve singleton Nodemailer transporter
   */
  private static getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (!ENV.SMTP_USER || !ENV.SMTP_PASS) {
      // No credentials provided; development console mock mode active
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: {
        user: ENV.SMTP_USER,
        pass: ENV.SMTP_PASS,
      },
    });

    return this.transporter;
  }

  /**
   * Safe non-blocking email dispatcher with graceful fallback
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transporter = this.getTransporter();

      if (!transporter) {
        console.log(`[EMAIL] 📬 (Dev Simulated Mail) To: ${options.to} | Subject: ${options.subject}`);
        return true;
      }

      await transporter.sendMail({
        from: ENV.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });

      console.log(`[EMAIL] ✅ Email successfully sent to: ${options.to}`);
      return true;
    } catch (error: any) {
      console.warn(`[EMAIL WARNING] Failed to send email to ${options.to}:`, error.message);
      // Non-blocking: returns false instead of throwing, preserving main transaction
      return false;
    }
  }

  /**
   * 1. Send Complaint Submission Confirmation Email
   */
  static async sendTicketConfirmationEmail(
    toEmail: string,
    studentName: string,
    complaint: {
      complaintId: string;
      title: string;
      category: string;
      location: { building: string; room?: string; floor?: string; roomNumber?: string };
    }
  ): Promise<boolean> {
    const subject = `[FixMyCampus] Confirmation: Ticket #${complaint.complaintId} Received`;
    const trackUrl = `${ENV.FRONTEND_URL}/my-complaints`;
    const roomDetail = complaint.location.room || complaint.location.roomNumber;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">FixMyCampus</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">Campus Facility Resolution System</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Complaint Submitted Successfully</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Hello <strong>${studentName || 'Student'}</strong>,<br/>
            Thank you for reporting this issue. Your complaint has been registered with the campus maintenance team.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Ticket ID:</strong> <span style="color: #2563eb; font-weight: 700;">${complaint.complaintId}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Title:</strong> <span style="color: #1e293b;">${complaint.title}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Category:</strong> <span style="color: #1e293b;">${complaint.category}</span></p>
            <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Location:</strong> <span style="color: #1e293b;">${complaint.location.building}${roomDetail ? ` (Room: ${roomDetail})` : ''}</span></p>
          </div>
          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${trackUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block; font-size: 14px;">Track My Complaint</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          This is an automated notification from FixMyCampus. You will receive updates as maintenance progresses.
        </div>
      </div>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  }

  /**
   * 2. Send Complaint Status Progression Email
   */
  static async sendStatusUpdateEmail(
    toEmail: string,
    studentName: string,
    complaint: {
      complaintId: string;
      title: string;
      status: string;
      department?: string;
    }
  ): Promise<boolean> {
    const subject = `[FixMyCampus] Update on Ticket #${complaint.complaintId}: Status is now "${complaint.status}"`;
    const trackUrl = `${ENV.FRONTEND_URL}/my-complaints`;

    let statusColor = '#2563eb';
    if (complaint.status === 'Resolved') statusColor = '#16a34a';
    if (complaint.status === 'In Progress') statusColor = '#d97706';
    if (complaint.status === 'Rejected') statusColor = '#dc2626';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: ${statusColor}; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">FixMyCampus</h1>
          <p style="color: #ffffff; opacity: 0.9; margin: 4px 0 0 0; font-size: 14px;">Complaint Status Update</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Status Changed to: <span style="color: ${statusColor};">${complaint.status}</span></h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Hello <strong>${studentName || 'Student'}</strong>,<br/>
            An administrator has updated the status of your complaint <strong>${complaint.complaintId}</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Ticket ID:</strong> <span style="color: #1e293b; font-weight: 700;">${complaint.complaintId}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Title:</strong> <span style="color: #1e293b;">${complaint.title}</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong>Current Status:</strong> <span style="color: ${statusColor}; font-weight: 700;">${complaint.status}</span></p>
            ${complaint.department ? `<p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Assigned Department:</strong> <span style="color: #1e293b;">${complaint.department}</span></p>` : ''}
          </div>
          <div style="text-align: center; margin: 28px 0 16px 0;">
            <a href="${trackUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block; font-size: 14px;">View Updated Ticket</a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          This is an automated notification from FixMyCampus. Thank you for helping keep our campus safe and functional.
        </div>
      </div>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  }

  /**
   * 3. Send Password Recovery Email
   */
  static async sendPasswordResetEmail(
    toEmail: string,
    studentName: string,
    resetUrl: string
  ): Promise<boolean> {
    const subject = `[FixMyCampus] Password Recovery Request`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background-color: #d97706; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">FixMyCampus</h1>
          <p style="color: #fef3c7; margin: 4px 0 0 0; font-size: 14px;">Account Security</p>
        </div>
        <div style="padding: 28px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            Hello <strong>${studentName || 'User'}</strong>,<br/>
            We received a request to reset the password for your FixMyCampus account. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #d97706; color: #ffffff; padding: 13px 32px; font-weight: 600; text-decoration: none; border-radius: 10px; display: inline-block; font-size: 15px;">Reset My Password</a>
          </div>
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; padding: 14px; margin: 20px 0; font-size: 13px; color: #92400e;">
            <strong>Security Notice:</strong> This reset link will expire in <strong>15 minutes</strong>. If you did not request this reset, you can safely ignore this email—your account remains secure.
          </div>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">
            If the button doesn't work, copy and paste this URL into your browser:<br/>
            <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
          Automated security dispatch from FixMyCampus.
        </div>
      </div>
    `;

    return this.sendEmail({ to: toEmail, subject, html });
  }
}
