import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = "noreply@nomad-life.app";
const FROM_NAME = "NomadLife";

export async function sendPasswordResetEmail(to: string, resetToken: string, username: string): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY not configured");
    return false;
  }

  const resetUrl = `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://nomad-life.app"}/reset-password?token=${resetToken}`;

  const msg = {
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: "Recupera la tua password - NomadLife",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 40px 20px;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; font-size: 28px; margin: 0;">🌍 NomadLife</h1>
            <p style="color: #6b7280; margin-top: 8px;">La piattaforma per nomadi digitali</p>
          </div>
          
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Ciao ${username},</h2>
          
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
            Hai richiesto il recupero della password del tuo account NomadLife. 
            Clicca il pulsante qui sotto per impostare una nuova password.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Reimposta Password
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            Questo link scadrà tra <strong>1 ora</strong>. Se non hai richiesto il recupero password, ignora questa email.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
            Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
            <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} NomadLife. Tutti i diritti riservati.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error: any) {
    console.error("SendGrid error:", error?.response?.body || error.message);
    return false;
  }
}
