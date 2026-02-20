import { Resend } from 'resend';
import { getSystemConfig } from '@/lib/config';

export async function sendOtpEmail(to: string, otp: string) {
  // Fetch dynamic config with fallback to environment variables
  const apiKey = await getSystemConfig('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  const fromEmail = await getSystemConfig('RESEND_FROM_EMAIL') || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const appName = process.env.APP_NAME || 'Digital Store';

  if (!apiKey) {
    console.error('RESEND_API_KEY not set');
    return false;
  }

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: `${appName} <${fromEmail}>`,
      to: [to],
      subject: `Your Login Code for ${appName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #16a34a; margin-top: 0;">Login Verification</h2>
          <p style="color: #4b5563;">Here is your verification code:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; font-size: 32px; color: #111827; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return false;
    }

    console.log('Email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('Email Send Exception:', error);
    return false;
  }
}

export async function sendResetPasswordEmail(to: string, token: string) {
  const apiKey = await getSystemConfig('RESEND_API_KEY') || process.env.RESEND_API_KEY;
  const fromEmail = await getSystemConfig('RESEND_FROM_EMAIL') || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const appUrl = await getSystemConfig('APP_URL') || process.env.APP_URL || 'http://localhost:3000';
  const appName = process.env.APP_NAME || 'Digital Store';

  if (!apiKey) return false;

  const resend = new Resend(apiKey);
  const resetLink = `${appUrl}/reset-password?token=${token}`;

  try {
    await resend.emails.send({
      from: `${appName} <${fromEmail}>`,
      to: [to],
      subject: `Reset Password - ${appName}`,
      html: `
        <div style="font-family: sans-serif; padding: 40px; border: 1px solid #e5e7eb; border-radius: 16px; max-width: 500px; margin: 0 auto; background-color: #ffffff;">
          <h2 style="color: #111827; margin-top: 0; font-size: 24px;">Reset Password</h2>
          <p style="color: #4b5563; line-height: 1.5;">Anda meminta untuk mereset password akun Anda. Klik tombol di bawah ini untuk melanjutkan:</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Atau copy link ini:</p>
          <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 8px; rounded: 4px;">${resetLink}</p>
          
          <p style="color: #ef4444; font-size: 12px; margin-top: 24px;">Link ini berlaku selama 1 jam.</p>
          <p style="color: #9ca3af; font-size: 12px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Email Send Exception:', error);
    return false;
  }
}
