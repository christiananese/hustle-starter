import { Resend } from "resend";

// Initialize Resend (will be null in development if no API key)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface InviteEmailParams {
  inviterName: string;
  inviterEmail: string;
  organizationName: string;
  inviteToken: string;
  recipientEmail: string;
  role: string;
}

export class EmailService {
  /**
   * Send an email using Resend or log to console in development
   */
  static async sendEmail({ to, subject, html, from }: SendEmailParams) {
    const fromEmail = from || process.env.FROM_EMAIL || "noreply@yourapp.com";

    // Development mode - log to console
    if (!resend || process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(80));
      console.log("📧 EMAIL (Development Mode)");
      console.log("=".repeat(80));
      console.log(`From: ${fromEmail}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("\nHTML Content:");
      console.log(html);
      console.log("=".repeat(80) + "\n");

      return { success: true, messageId: `dev-${Date.now()}` };
    }

    // Production mode - send via Resend
    try {
      const result = await resend.emails.send({
        from: fromEmail,
        to: [to],
        subject,
        html,
      });

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error("Failed to send email");
    }
  }

  /**
   * Send organization invite email
   */
  static async sendInviteEmail({
    inviterName,
    inviterEmail,
    organizationName,
    inviteToken,
    recipientEmail,
    role,
  }: InviteEmailParams) {
    const inviteUrl = `${process.env.CORS_ORIGIN}/auth/accept-invite?token=${inviteToken}`;

    const subject = `You're invited to join ${organizationName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Organization Invite</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <p style="font-size: 16px; margin: 0 0 15px 0;">
              <strong>${inviterName}</strong> (${inviterEmail}) has invited you to join <strong>${organizationName}</strong> as a <strong>${role}</strong>.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}"
               style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Accept Invitation
            </a>
          </div>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Note:</strong> This invitation will expire in 7 days. If you don't have an account, you'll be able to create one during the acceptance process.
            </p>
          </div>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
              ${inviteUrl}
            </p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: recipientEmail,
      subject,
      html,
    });
  }

  /**
   * Send welcome email after invite acceptance
   */
  static async sendWelcomeEmail({
    userName,
    userEmail,
    organizationName,
    role,
  }: {
    userName: string;
    userEmail: string;
    organizationName: string;
    role: string;
  }) {
    const subject = `Welcome to ${organizationName}!`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome! 🚀</h1>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <p style="font-size: 16px; margin: 0 0 15px 0;">
              Hi <strong>${userName}</strong>,
            </p>
            <p style="font-size: 16px; margin: 0;">
              You've successfully joined <strong>${organizationName}</strong> as a <strong>${role}</strong>. You can now access the dashboard and start collaborating with your team.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CORS_ORIGIN}/dashboard"
               style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

          <div style="font-size: 12px; color: #666; text-align: center;">
            <p>Need help getting started? Check out our documentation or contact support.</p>
          </div>
        </body>
      </html>
    `;

    return await this.sendEmail({
      to: userEmail,
      subject,
      html,
    });
  }
}
