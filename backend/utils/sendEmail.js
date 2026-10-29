const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // O Nodemailer fará o upgrade automático para STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(to, code) {
  await transporter.sendMail({
    from: `"PixelTech" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Seu código de verificação — PixelTech",
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #1C1B22;">Confirme seu e-mail</h2>
        <p style="color: #55525E;">Use o código abaixo para confirmar seu e-mail na PixelTech. Ele expira em 10 minutos.</p>
        <div style="background: #F7F5F1; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1C1B22;">${code}</span>
        </div>
        <p style="color: #8B8894; font-size: 13px;">Se você não pediu esse código, pode ignorar este e-mail.</p>
      </div>
    `,
  });
}

module.exports = sendOtpEmail;