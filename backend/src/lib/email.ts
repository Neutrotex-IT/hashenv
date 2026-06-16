import crypto from 'crypto';

/**
 * Email service for SENDING emails only (no email receiving functionality)
 * Uses Brevo API for transactional email delivery
 * 
 * This service only sends emails - it does NOT receive or process incoming emails.
 * All email operations are outbound only.
 */

const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email';

/**
 * Get Brevo API key from environment variables
 */
function getBrevoApiKey(): string {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not set. Please set it to your Brevo API key.');
  }
  return apiKey;
}

/**
 * Get sender email and name from environment variables
 * This is used as the "from" address for all outgoing emails
 */
function getSenderInfo(): { email: string; name?: string } {
  const email = process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL;
  const name = process.env.BREVO_SENDER_NAME || process.env.BREVO_DISPLAY_NAME;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL must be set to a valid email address.');
  }

  return {
    email: email.trim(),
    ...(name && typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
  };
}

/**
 * Send email via Brevo API (send-only operation)
 * This function only sends emails and does not handle incoming emails
 * 
 * @param to - Array of recipient email addresses with optional names
 * @param subject - Email subject line
 * @param htmlContent - HTML content of the email
 * @param textContent - Optional plain text content of the email
 * @throws Error if email sending fails
 */
async function sendEmailViaBrevo(
  to: { email: string; name?: string }[],
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<void> {
  const apiKey = getBrevoApiKey();
  const sender = getSenderInfo();

  // Validate recipients
  if (!to || !Array.isArray(to) || to.length === 0) {
    throw new Error('At least one recipient email address is required');
  }

  // Validate each recipient email
  for (const recipient of to) {
    if (!recipient.email || typeof recipient.email !== 'string' || !recipient.email.includes('@')) {
      throw new Error(`Invalid recipient email address: ${recipient.email}`);
    }
  }

  // Prepare payload for Brevo API
  const payload = {
    sender,
    to,
    subject,
    htmlContent,
    ...(textContent ? { textContent } : {}),
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Brevo API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        // If parsing fails, use the text as is
        if (errorText) {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    // Email sent successfully - no need to parse response for send-only operation
    return;
  } catch (error) {
    // Re-throw with additional context if it's not already an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to send email: ${String(error)}`);
  }
}

/**
 * Generate a secure random token for email verification or password reset
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send email verification email via Brevo API (send-only)
 * 
 * @param email - Recipient email address
 * @param token - Verification token
 * @param name - Recipient name
 * @throws Error if email sending fails
 */
export async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

  // Always log verification URL in development
  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== EMAIL VERIFICATION (DEVELOPMENT MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify Your Email Address - HashEnv`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('===========================================================\n');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with HashEnv. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold;">Verify Email Address</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <div class="footer">
          <p>Best regards,<br>The HashEnv Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name},\n\nThank you for registering with HashEnv. Please verify your email address by visiting the following link:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you didn't create an account, you can safely ignore this email.\n\nBest regards,\nThe HashEnv Team`;

  try {
    await sendEmailViaBrevo(
      [{ email, name }],
      'Verify Your Email Address - HashEnv',
      htmlContent,
      textContent
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Verification email sent successfully via Brevo');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Failed to send verification email via Brevo:', {
      error: errorMessage,
      email,
    });

    // Log verification URL as fallback when email fails
    console.log('\n========== VERIFICATION URL (EMAIL FAILED - USE THIS AS FALLBACK) ==========');
    console.log(`Email: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log('NOTE: Copy this URL and use it to verify the account manually');
    console.log('====================================================================\n');

    // Still throw error so caller knows email failed
    throw new Error(`Failed to send verification email: ${errorMessage}`);
  }
}

/**
 * Send password reset email via Brevo API (send-only)
 * 
 * @param email - Recipient email address
 * @param token - Password reset token
 * @param name - Recipient name
 * @throws Error if email sending fails
 */
export async function sendPasswordResetEmail(email: string, token: string, name: string): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

  // Always log reset URL in development
  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== PASSWORD RESET (DEVELOPMENT MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your Password - HashEnv`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('======================================================\n');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Reset Your Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password for your HashEnv account. Click the button below to reset your password:</p>
        <a href="${resetUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold;">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <div class="warning">
          <p><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
        </div>
        <div class="footer">
          <p>Best regards,<br>The HashEnv Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello ${name},\n\nWe received a request to reset your password for your HashEnv account. Please visit the following link to reset your password:\n\n${resetUrl}\n\nSecurity Notice: This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.\n\nBest regards,\nThe HashEnv Team`;

  try {
    await sendEmailViaBrevo(
      [{ email, name }],
      'Reset Your Password - HashEnv',
      htmlContent,
      textContent
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Password reset email sent successfully via Brevo');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Failed to send password reset email via Brevo:', {
      error: errorMessage,
      email,
    });

    // Log reset URL as fallback when email fails
    console.log('\n========== PASSWORD RESET URL (EMAIL FAILED - USE THIS AS FALLBACK) ==========');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('NOTE: Copy this URL and use it to reset the password manually');
    console.log('==================================================================\n');

    // Still throw error so caller knows email failed
    throw new Error(`Failed to send password reset email: ${errorMessage}`);
  }
}

/**
 * Send organization invite email via Brevo API (send-only)
 */
export async function sendOrgInviteEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== ORG INVITE (DEVELOPMENT MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Subject: You've been invited to join ${organizationName} on HashEnv`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('===================================================\n');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>You're invited to join ${organizationName}</h2>
        <p>Hello,</p>
        <p>${inviterName} has invited you to join <strong>${organizationName}</strong> on HashEnv.</p>
        <p>Click the button below to accept the invitation. If you don't have an account yet, you'll be asked to create one first.</p>
        <a href="${inviteUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This invitation will expire in 7 days.</p>
        <div class="footer">
          <p>Best regards,<br>The HashEnv Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello,\n\n${inviterName} has invited you to join ${organizationName} on HashEnv.\n\nAccept the invitation by visiting:\n\n${inviteUrl}\n\nThis invitation will expire in 7 days.\n\nBest regards,\nThe HashEnv Team`;

  try {
    await sendEmailViaBrevo(
      [{ email }],
      `You've been invited to join ${organizationName} on HashEnv`,
      htmlContent,
      textContent
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Organization invite email sent successfully via Brevo');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Failed to send organization invite email via Brevo:', {
      error: errorMessage,
      email,
    });

    console.log('\n========== INVITE URL (EMAIL FAILED - USE THIS AS FALLBACK) ==========');
    console.log(`Email: ${email}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('====================================================================\n');

    throw new Error(`Failed to send organization invite email: ${errorMessage}`);
  }
}

/**
 * Send project invite email via Brevo API (send-only)
 */
export async function sendProjectInviteEmail(
  email: string,
  token: string,
  projectName: string,
  inviterName: string
): Promise<void> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const inviteUrl = `${frontendUrl}/accept-invite?token=${token}`;

  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== PROJECT INVITE (DEVELOPMENT MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Subject: You've been invited to collaborate on ${projectName} on HashEnv`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('=======================================================\n');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>You're invited to collaborate on ${projectName}</h2>
        <p>Hello,</p>
        <p>${inviterName} has invited you to collaborate on <strong>${projectName}</strong> on HashEnv.</p>
        <p>You must already be a member of the project's organization. If you are not, ask your admin for an organization invite first.</p>
        <a href="${inviteUrl}" class="button" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff !important; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold;">Accept Invitation</a>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p>This invitation will expire in 7 days.</p>
        <div class="footer">
          <p>Best regards,<br>The HashEnv Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `Hello,\n\n${inviterName} has invited you to collaborate on ${projectName} on HashEnv.\n\nAccept the invitation by visiting:\n\n${inviteUrl}\n\nThis invitation will expire in 7 days.\n\nBest regards,\nThe HashEnv Team`;

  try {
    await sendEmailViaBrevo(
      [{ email }],
      `You've been invited to collaborate on ${projectName} on HashEnv`,
      htmlContent,
      textContent
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('✓ Project invite email sent successfully via Brevo');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Failed to send project invite email via Brevo:', {
      error: errorMessage,
      email,
    });

    console.log('\n========== INVITE URL (EMAIL FAILED - USE THIS AS FALLBACK) ==========');
    console.log(`Email: ${email}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('====================================================================\n');

    throw new Error(`Failed to send project invite email: ${errorMessage}`);
  }
}
