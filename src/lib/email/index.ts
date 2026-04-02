import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set — password reset email not sent");
    return;
  }

  await getResend().emails.send({
    from: "OmniLife <onboarding@resend.dev>",
    to,
    subject: "Reset your OmniLife password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#7c3aed,#0d9488);">
              <div style="font-size:28px;margin-bottom:8px;">💜</div>
              <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">OmniLife</div>
              <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">Relationship Optimizer</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="color:#f4f4f5;font-size:20px;font-weight:600;margin:0 0 12px;">Reset your password</h1>
              <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                We received a request to reset the password for your OmniLife account. Click the button below to choose a new password.
              </p>
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#0d9488);color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  Reset Password
                </a>
              </div>
              <p style="color:#71717a;font-size:13px;line-height:1.6;margin:0 0 8px;">
                This link expires in <strong style="color:#a1a1aa;">1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color:#52525b;font-size:12px;margin:0;">
                Or copy this link: <span style="color:#7c3aed;">${resetUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;text-align:center;">
              <p style="color:#52525b;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} OmniLife · Built with 💜 for better relationships
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
}
