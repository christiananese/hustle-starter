import { render } from "@react-email/render";
import { Resend } from "resend";
import { InviteEmail, type InviteEmailData } from "./templates/invite";
import { WelcomeEmail, type WelcomeEmailData } from "./templates/welcome";

// Initialize Resend (will be null in development if no API key)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export type EmailTemplate = "invite" | "welcome";

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: InviteEmailData | WelcomeEmailData;
  from?: string;
}

export class EmailService {
  /**
   * Send an email using a React template
   */
  static async send({ to, subject, template, data, from }: SendEmailOptions) {
    const fromEmail = from || process.env.FROM_EMAIL || "noreply@yourapp.com";

    // Render the template to HTML
    const html = await this.renderTemplate(template, data);

    // Development mode - log minimal info to console
    if (!resend || process.env.NODE_ENV === "development") {
      console.log("\n" + "=".repeat(60));
      console.log("📧 EMAIL SENT (Development Mode)");
      console.log("=".repeat(60));
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Template: ${template}`);

      // Extract and log important links
      if (template === "invite" && "inviteUrl" in data) {
        console.log(`🔗 Invite Link: ${data.inviteUrl}`);
      }
      if (template === "welcome" && "dashboardUrl" in data) {
        console.log(`🔗 Dashboard Link: ${data.dashboardUrl}`);
      }

      console.log("=".repeat(60) + "\n");

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
   * Render a React template to HTML
   */
  private static async renderTemplate(
    template: EmailTemplate,
    data: any
  ): Promise<string> {
    switch (template) {
      case "invite":
        return await render(InviteEmail(data as InviteEmailData));
      case "welcome":
        return await render(WelcomeEmail(data as WelcomeEmailData));
      default:
        throw new Error(`Unknown email template: ${template}`);
    }
  }

  /**
   * Send organization invite email
   */
  static async sendInvite(data: InviteEmailData) {
    return await this.send({
      to: data.recipientEmail,
      subject: `You're invited to join ${data.organizationName}`,
      template: "invite",
      data,
    });
  }

  /**
   * Send welcome email after invite acceptance
   */
  static async sendWelcome(data: WelcomeEmailData) {
    return await this.send({
      to: data.userEmail,
      subject: `Welcome to ${data.organizationName}!`,
      template: "welcome",
      data,
    });
  }
}
