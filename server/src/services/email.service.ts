import { Resend } from 'resend';
import { ENV } from '../config/env';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

export interface PaymentReceiptData {
  receiptNumber: string;
  orderId: string;
  paymentId: string;
  planName: string;
  amount: number; // in smallest unit (paise)
  currency: string;
  paidAt: Date;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!ENV.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(ENV.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Low-level transactional email sender via Resend REST SDK
 */
export async function sendResendEmail(params: {
  toEmail: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<SendEmailResult> {
  const { toEmail, toName, subject, htmlContent, textContent } = params;

  if (!ENV.RESEND_API_KEY) {
    console.log(`[Resend Email Simulated] To: ${toEmail} | Subject: "${subject}" (RESEND_API_KEY not configured)`);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      simulated: true,
    };
  }

  try {
    const resend = getResendClient();
    if (!resend) {
      return { success: false, error: 'Resend client is not initialized' };
    }

    // PRIMARY SENDER: pulse.avixstudio.com is verified on Resend
    let senderAddress = ENV.RESEND_SENDER_EMAIL || 'noreply@pulse.avixstudio.com';
    // If sender was configured with unverified root domain avixstudio.com, map to verified pulse.avixstudio.com
    if (senderAddress.endsWith('@avixstudio.com') && !senderAddress.endsWith('@pulse.avixstudio.com')) {
      senderAddress = senderAddress.replace('@avixstudio.com', '@pulse.avixstudio.com');
    }
    const from = `${ENV.RESEND_SENDER_NAME || 'PULSE'} <${senderAddress}>`;
    const replyTo = ENV.RESEND_SUPPORT_EMAIL || 'supportpulseteam@gmail.com';

    let { data, error } = await resend.emails.send({
      from,
      to: [toEmail],
      replyTo,
      subject,
      html: htmlContent,
      text: textContent || subject,
    });

    if (error) {
      console.error(`[Resend Error] Failed sending email to ${toEmail} from ${from}:`, error.message);
      // Auto-fallback: if sending failed, retry once with verified noreply@pulse.avixstudio.com
      if (senderAddress !== 'noreply@pulse.avixstudio.com') {
        console.log(`[Resend Retry] Retrying with verified sender noreply@pulse.avixstudio.com`);
        const retry = await resend.emails.send({
          from: "PULSE <noreply@pulse.avixstudio.com>",
          to: [toEmail],
          replyTo,
          subject,
          html: htmlContent,
          text: textContent || subject,
        });
        if (!retry.error && retry.data) {
          console.log(`[Resend Retry Success] Sent to ${toEmail}: ID ${retry.data.id}`);
          return {
            success: true,
            messageId: retry.data.id,
          };
        }
      }
      return { success: false, error: error.message };
    }

    console.log(`[Resend Success] Sent email to ${toEmail} (ID: ${data?.id})`);
    return {
      success: true,
      messageId: data?.id || `resend_${Date.now()}`,
    };
  } catch (err: any) {
    console.error(`[Resend Network Error] Failed sending email to ${toEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Aliases for backwards compatibility & convenience
export const sendBrevoEmail = sendResendEmail;
export const sendEmail = sendResendEmail;

/**
 * Send branded email verification email
 */
export async function sendVerificationEmail(
  toEmail: string,
  toName: string,
  rawToken: string
): Promise<SendEmailResult> {
  const verifyUrl = `${ENV.FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

  const subject = 'Verify your email address for PULSE';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560px" style="max-width: 560px; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); border-radius: 10px; font-weight: 800; font-size: 20px; letter-spacing: 2px; color: #FFFFFF; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                      ⚡ PULSE
                    </div>
                    <h2 style="margin: 16px 0 0 0; color: #F8FAFC; font-size: 22px; font-weight: 700;">Confirm Your Email Address</h2>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0;">Hello <strong style="color: #F8FAFC;">${toName || 'Athlete'}</strong>,</p>
                    <p style="margin: 0 0 24px 0;">
                      Thank you for joining <strong>PULSE</strong>, your ultimate daily fitness accountability system. To secure your account, access paid plans, and receive official transaction receipts, please verify your email address.
                    </p>

                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(217, 139, 74, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                            Verify Email Address
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 12px; color: #38BDF8; word-break: break-all; background-color: #0F172A; padding: 12px; border-radius: 8px; border: 1px solid #1E293B;">
                      <a href="${verifyUrl}" style="color: #38BDF8; text-decoration: underline;">${verifyUrl}</a>
                    </p>

                    <div style="background-color: #0F172A; border-left: 3px solid #D98B4A; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #94A3B8; margin-top: 24px;">
                      ⏳ This verification link expires in <strong>24 hours</strong> and can only be used once. If you did not create a PULSE account, you can safely ignore this email.
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">PULSE Fitness Platform · High-Performance Daily Habits</p>
                    <p style="margin: 0;">Need help? Reach out at <a href="mailto:${ENV.RESEND_SUPPORT_EMAIL}" style="color: #D98B4A; text-decoration: none;">${ENV.RESEND_SUPPORT_EMAIL}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    textContent: `Verify your email for PULSE: ${verifyUrl} (expires in 24 hours)`,
  });
}

/**
 * Send branded payment receipt confirmation email
 */
export async function sendPaymentReceiptEmail(
  toEmail: string,
  toName: string,
  receipt: PaymentReceiptData
): Promise<SendEmailResult> {
  const formattedAmount = (receipt.amount / 100).toFixed(2);
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(receipt.paidAt);

  const subject = `Payment Receipt - ${receipt.planName} (Receipt #${receipt.receiptNumber})`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580px" style="max-width: 580px; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); border-radius: 10px; font-weight: 800; font-size: 20px; letter-spacing: 2px; color: #FFFFFF;">
                      ⚡ PULSE
                    </div>
                    <div style="margin-top: 16px; display: inline-block; padding: 4px 12px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; border-radius: 20px; color: #10B981; font-size: 13px; font-weight: 600;">
                      ✓ Payment Captured Successfully
                    </div>
                    <h2 style="margin: 14px 0 4px 0; color: #F8FAFC; font-size: 22px; font-weight: 700;">Official Payment Receipt</h2>
                    <p style="margin: 0; color: #94A3B8; font-size: 13px;">Receipt Number: <strong style="color: #F8FAFC;">${receipt.receiptNumber}</strong></p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 28px 32px; color: #CBD5E1; font-size: 14px;">
                    <p style="margin: 0 0 16px 0;">Hello <strong style="color: #F8FAFC;">${toName || 'Athlete'}</strong>,</p>
                    <p style="margin: 0 0 24px 0; color: #94A3B8;">
                      Thank you for supporting PULSE. Your subscription is active, and your transaction has been confirmed. Below are your official receipt details:
                    </p>

                    <!-- Receipt Summary Table -->
                    <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #0F172A; border-radius: 10px; border: 1px solid #334155; margin-bottom: 24px; font-size: 14px;">
                      <tr style="border-bottom: 1px solid #1E293B;">
                        <td style="color: #94A3B8;">Merchant</td>
                        <td align="right" style="color: #F8FAFC; font-weight: 600;">PULSE Fitness (Avix Studio)</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #1E293B;">
                        <td style="color: #94A3B8;">Product / Plan</td>
                        <td align="right" style="color: #F8FAFC; font-weight: 600;">${receipt.planName}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #1E293B;">
                        <td style="color: #94A3B8;">Amount Paid</td>
                        <td align="right" style="color: #D98B4A; font-weight: 700; font-size: 17px;">₹${formattedAmount} ${receipt.currency}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #1E293B;">
                        <td style="color: #94A3B8;">Payment Date</td>
                        <td align="right" style="color: #F8FAFC;">${formattedDate}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #1E293B;">
                        <td style="color: #94A3B8;">Transaction ID (Razorpay)</td>
                        <td align="right" style="color: #94A3B8; font-family: monospace; font-size: 12px;">${receipt.paymentId}</td>
                      </tr>
                      <tr>
                        <td style="color: #94A3B8;">Order Reference</td>
                        <td align="right" style="color: #94A3B8; font-family: monospace; font-size: 12px;">${receipt.orderId}</td>
                      </tr>
                    </table>

                    <div style="background-color: #0F172A; border: 1px solid #334155; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #94A3B8;">
                      🔒 <strong>Security & Compliance:</strong> PULSE never receives, stores, or processes sensitive card details, CVVs, or bank credentials. All transactions are securely processed by Razorpay Payments India.
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0 0 6px 0;">Questions about your bill or subscription?</p>
                    <p style="margin: 0;">Contact our support team at <a href="mailto:${ENV.RESEND_SUPPORT_EMAIL}" style="color: #D98B4A; text-decoration: none;">${ENV.RESEND_SUPPORT_EMAIL}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    textContent: `Payment Receipt: ${receipt.planName} - ₹${formattedAmount} ${receipt.currency}. Receipt #${receipt.receiptNumber}. Support: ${ENV.RESEND_SUPPORT_EMAIL}`,
  });
}

/**
 * Send branded password reset email with secure single-use recovery link
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  rawToken: string,
  customFrontendUrl?: string
): Promise<SendEmailResult> {
  const baseUrl = (customFrontendUrl || ENV.FRONTEND_URL).replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = 'Reset your password for PULSE';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560px" style="max-width: 560px; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); border-radius: 10px; font-weight: 800; font-size: 20px; letter-spacing: 2px; color: #FFFFFF;">
                      ⚡ PULSE
                    </div>
                    <h2 style="margin: 16px 0 0 0; color: #F8FAFC; font-size: 22px; font-weight: 700;">Password Reset Request</h2>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0;">Hello <strong style="color: #F8FAFC;">${toName || 'Athlete'}</strong>,</p>
                    <p style="margin: 0 0 24px 0;">
                      We received a request to reset the password for your <strong>PULSE</strong> account. You can use the button below or copy your security token directly:
                    </p>

                    <!-- Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0 20px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(217, 139, 74, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Token Box (For manual copy/paste if link is mangled or blocked) -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #0F172A; border-radius: 12px; border: 1px solid #334155; padding: 18px;">
                      <tr>
                        <td>
                          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #D98B4A; font-weight: 700; margin-bottom: 8px;">
                            🔑 Password Reset Token (Security Code)
                          </div>
                          <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 13px; font-weight: 700; color: #F8FAFC; background-color: #1E293B; padding: 12px 14px; border-radius: 8px; border: 1px dashed #D98B4A; word-break: break-all; user-select: all; -webkit-user-select: all;">
                            ${rawToken}
                          </div>
                          <div style="font-size: 12px; color: #94A3B8; margin-top: 10px; line-height: 1.4;">
                            💡 <em>If clicking the button doesn't open the reset screen directly, you can copy the token above and paste it directly into the <strong>Reset Password</strong> screen in PULSE.</em>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 10px 0; font-size: 13px; color: #94A3B8;">
                      Direct reset link:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 12px; color: #38BDF8; word-break: break-all; background-color: #0F172A; padding: 12px; border-radius: 8px; border: 1px solid #1E293B;">
                      <a href="${resetUrl}" style="color: #38BDF8; text-decoration: underline;">${resetUrl}</a>
                    </p>

                    <div style="background-color: #0F172A; border-left: 3px solid #D98B4A; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #94A3B8; margin-top: 24px;">
                      ⏳ <strong>Security Notice:</strong> This password reset link and token expire in <strong>1 hour</strong> and can only be used once. If you did not request this reset, your account is safe and you can safely ignore this email.
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">PULSE Fitness Platform · High-Performance Daily Habits</p>
                    <p style="margin: 0;">Need help? Reach out at <a href="mailto:${ENV.RESEND_SUPPORT_EMAIL}" style="color: #D98B4A; text-decoration: none;">${ENV.RESEND_SUPPORT_EMAIL}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    textContent: `Reset your PULSE password:\nLink: ${resetUrl}\n\nPassword Reset Security Token:\n${rawToken}\n\n(Token expires in 1 hour and can only be used once.)`,
  });
}

/**
 * Send security notification after a password has been successfully changed
 */
export async function sendPasswordChangedNotificationEmail(
  toEmail: string,
  toName: string
): Promise<SendEmailResult> {
  const subject = 'Your PULSE account password was changed';
  const changedAtFormatted = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0F172A; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560px" style="max-width: 560px; background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" cellpadding="0" cellspacing="0">
                <!-- Header -->
                <tr>
                  <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #334155;">
                    <div style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #D98B4A 0%, #B45F1E 100%); border-radius: 10px; font-weight: 800; font-size: 20px; letter-spacing: 2px; color: #FFFFFF;">
                      ⚡ PULSE
                    </div>
                    <div style="margin-top: 14px; display: inline-block; padding: 4px 12px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; border-radius: 20px; color: #10B981; font-size: 13px; font-weight: 600;">
                      ✓ Security Confirmation
                    </div>
                    <h2 style="margin: 14px 0 0 0; color: #F8FAFC; font-size: 22px; font-weight: 700;">Password Changed Successfully</h2>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px; color: #CBD5E1; font-size: 15px; line-height: 1.6;">
                    <p style="margin: 0 0 16px 0;">Hello <strong style="color: #F8FAFC;">${toName || 'Athlete'}</strong>,</p>
                    <p style="margin: 0 0 16px 0;">
                      The password for your <strong>PULSE</strong> account was successfully updated on <strong>${changedAtFormatted} IST</strong>.
                    </p>
                    <p style="margin: 0 0 20px 0; color: #94A3B8;">
                      As a security precaution, all other active sessions and remembered devices for this account have been logged out.
                    </p>

                    <div style="background-color: #0F172A; border-left: 3px solid #EF4444; padding: 12px 16px; border-radius: 4px; font-size: 13px; color: #F87171; margin-top: 20px;">
                      ⚠️ <strong>Did not make this change?</strong> If you did not reset or change your password, someone may have unauthorized access to your account. Please contact our support team immediately at <a href="mailto:${ENV.RESEND_SUPPORT_EMAIL}" style="color: #F87171; text-decoration: underline;">${ENV.RESEND_SUPPORT_EMAIL}</a>.
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #0F172A; border-top: 1px solid #334155; text-align: center; color: #64748B; font-size: 12px;">
                    <p style="margin: 0 0 8px 0;">PULSE Fitness Platform · High-Performance Daily Habits</p>
                    <p style="margin: 0;">Need help? Reach out at <a href="mailto:${ENV.RESEND_SUPPORT_EMAIL}" style="color: #D98B4A; text-decoration: none;">${ENV.RESEND_SUPPORT_EMAIL}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return sendResendEmail({
    toEmail,
    toName,
    subject,
    htmlContent,
    textContent: `Your PULSE password was successfully changed on ${changedAtFormatted}. If you did not make this change, contact ${ENV.RESEND_SUPPORT_EMAIL} immediately.`,
  });
}

