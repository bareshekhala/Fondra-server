const { BrevoClient } = require("@getbrevo/brevo");

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

const emailLayout = (content) => `
  <div style="margin:0;padding:32px 16px;background:#F4F1EC;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1E1A2F;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;margin:0 auto;">
      <tr>
        <td style="padding:0 0 20px;">
          <span style="font-family:Georgia,serif;font-size:22px;">Fondra</span>
        </td>
      </tr>
      <tr>
        <td style="background:#FFFFFF;border-radius:20px;padding:28px 28px 24px;font-size:15px;line-height:1.55;">
          ${content}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:#6F6A86;">
          Fondra · one tap says you're okay.<br>
          If you didn't sign up for Fondra, you can ignore this email.
        </td>
      </tr>
    </table>
  </div>
`;

const sendVerificationCode = async (to, name, code) => {
  await brevo.transactionalEmails.sendTransacEmail({
    sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME },
    to: [{ email: to, name }],
    subject: `${code} is your Fondra code`,
    htmlContent: emailLayout(`
      <p style="margin:0 0 16px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Your code is</p>
      <p style="margin:0 0 20px;">
        <span style="display:inline-block;background:#F1D48A;border-radius:999px;padding:10px 22px;font-size:28px;font-weight:700;letter-spacing:6px;">${code}</span>
      </p>
      <p style="margin:0;color:#4A4462;">It expires in 10 minutes.</p>
    `),
  });
};

module.exports = { sendVerificationCode };
