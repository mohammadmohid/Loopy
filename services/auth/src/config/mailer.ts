import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return _transporter;
}

const brandColor = "#c0513f"; // Loopy primary
const brandColorLight = "#fdf2f0";

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .logo { font-size: 24px; font-weight: 700; color: ${brandColor}; letter-spacing: -0.5px; margin-bottom: 32px; }
    .otp-code { background: ${brandColorLight}; border: 2px dashed ${brandColor}; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code span { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${brandColor}; font-family: monospace; }
    h2 { color: #1a1a2e; font-size: 20px; margin: 0 0 12px 0; }
    p { color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: ${brandColor}; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .btn:hover { opacity: 0.9; }
    .footer { text-align: center; margin-top: 24px; }
    .footer p { color: #a1a1aa; font-size: 12px; }
    .divider { height: 1px; background: #e4e4e7; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">Loopy</div>
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Loopy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOTPEmail(
  to: string,
  code: string,
  firstName: string
): Promise<void> {
  const html = baseLayout(`
    <h2>Verify your email</h2>
    <p>Hi ${firstName}, welcome to Loopy! Enter the code below to verify your email address and get started.</p>
    <div class="otp-code">
      <span>${code}</span>
    </div>
    <p>This code expires in <strong>10 minutes</strong>. If you didn't create an account, you can safely ignore this email.</p>
    <div class="divider"></div>
    <p style="font-size: 12px; color: #a1a1aa;">Having trouble? Contact us at support@loopy.app</p>
  `);

  await getTransporter().sendMail({
    from: `"Loopy" <${process.env.SMTP_USER}>`,
    to,
    subject: `${code} is your Loopy verification code`,
    html,
  });
}

export async function sendInviteEmail(
  to: string,
  inviteToken: string,
  workspaceName: string,
  inviterName: string
): Promise<void> {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const joinUrl = `${clientUrl}/join?token=${inviteToken}`;

  const html = baseLayout(`
    <h2>You've been invited!</h2>
    <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Loopy.</p>
    <p>Loopy helps teams manage projects, run meetings, and collaborate in real-time. Click below to accept the invitation and get started.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${joinUrl}" class="btn">Join ${workspaceName}</a>
    </div>
    <div class="divider"></div>
    <p style="font-size: 12px; color: #a1a1aa;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
    <p style="font-size: 11px; color: #d4d4d8; word-break: break-all;">Or copy this link: ${joinUrl}</p>
  `);

  await getTransporter().sendMail({
    from: `"Loopy" <${process.env.SMTP_USER}>`,
    to,
    subject: `${inviterName} invited you to ${workspaceName} on Loopy`,
    html,
  });
}
