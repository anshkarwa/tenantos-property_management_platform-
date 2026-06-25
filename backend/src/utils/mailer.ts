import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendPasswordResetEmail(to: string, resetLink: string, role: 'landlord' | 'tenant') {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"TenantOS" <noreply@tenantos.com>',
    to,
    subject: 'Password Reset - TenantOS',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password — TenantOS</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

        <!-- Outer wrapper -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f4f6fb" style="padding:48px 16px;">
          <tr>
            <td align="center">

              <!-- Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;width:100%;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

                <!-- ── Brand header ── -->
                <tr>
                  <td style="background:linear-gradient(135deg,#1e2a4a 0%,#2d3a6b 100%);padding:36px 40px 32px 40px;border-bottom:1px solid #e2e8f0;">

                    <!-- Logo -->
                    <span style="font-size:17px;font-weight:700;color:#ffffff;letter-spacing:-0.4px;">TenantOS</span>

                    <!-- Lock icon -->
                    <div style="margin-top:28px;width:56px;height:56px;border-radius:14px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);text-align:center;line-height:56px;">
                      <span style="font-size:24px;">&#128274;</span>
                    </div>

                    <h1 style="margin:20px 0 8px 0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.6px;line-height:1.25;">Reset your password</h1>
                    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);line-height:1.5;">
                      You requested a password reset for your <strong style="color:rgba(255,255,255,0.9);font-weight:500;">TenantOS ${role}</strong> account.
                    </p>
                  </td>
                </tr>

                <!-- ── Body ── -->
                <tr>
                  <td style="background:#ffffff;padding:36px 40px;">

                    <p style="margin:0 0 24px 0;font-size:15px;line-height:26px;color:#4a5568;">
                      Click the button below to set a new password. This link is valid for <strong style="color:#1a202c;">1 hour</strong> and can only be used once.
                    </p>

                    <!-- CTA Button -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;margin-bottom:28px;">
                      <tr>
                        <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#3d7bff 0%,#6f4dff 100%);box-shadow:0 4px 16px rgba(61,123,255,0.25);">
                          <a href="${resetLink}" target="_blank"
                             style="display:block;padding:15px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;border-radius:10px;">
                            Reset My Password &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Fallback URL box -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;margin-bottom:28px;">
                      <tr>
                        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                          <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">Or copy this link</p>
                          <p style="margin:0;font-size:12px;color:#3d7bff;word-break:break-all;line-height:1.6;">${resetLink}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;margin:4px 0 28px 0;">
                      <tr>
                        <td style="border-top:1px solid #e2e8f0;"></td>
                      </tr>
                    </table>

                    <!-- Security notice -->
                    <table border="0" cellspacing="0" cellpadding="0" style="width:100%;">
                      <tr>
                        <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;">
                          <p style="margin:0;font-size:13px;line-height:21px;color:#78716c;">
                            <strong style="color:#b45309;">&#9888;&nbsp; Didn't request this?</strong><br/>
                            If you didn't ask for a password reset, no action is needed — your password is still safe and unchanged.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:24px 0 0 0;font-size:13px;line-height:22px;color:#94a3b8;">
                      Having trouble? <a href="mailto:support@tenantos.com" style="color:#3d7bff;text-decoration:none;font-weight:500;">Contact support</a> and we'll help you out.
                    </p>

                  </td>
                </tr>

                <!-- ── Footer ── -->
                <tr>
                  <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                    <p style="margin:0 0 4px 0;font-size:12px;color:#94a3b8;">&copy; ${new Date().getFullYear()} TenantOS &middot; India&apos;s Property Management Platform</p>
                    <p style="margin:0;font-size:11px;color:#cbd5e1;">This is an automated email — please do not reply directly to this message.</p>
                  </td>
                </tr>

              </table>
              <!-- /Card -->

            </td>
          </tr>
        </table>

      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[MAILER] Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[MAILER] Error sending password reset email:', error);
    throw error;
  }
}
