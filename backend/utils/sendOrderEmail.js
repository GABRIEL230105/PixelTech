const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Nome, endereço e nome dos produtos vêm do que o usuário digitou/enviou,
// então precisam ser "escapados" antes de entrar no HTML do e-mail.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBRL(value) {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date) {
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: "America/Manaus",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatAddress(address) {
  if (!address) return "";
  const line1 = [address.street, address.number].filter(Boolean).join(", ");
  const line2 = [address.neighborhood, [address.city, address.state].filter(Boolean).join(" - ")]
    .filter(Boolean)
    .join(" · ");
  return [line1, line2, address.zip ? `CEP ${address.zip}` : ""].filter(Boolean).join("\n");
}

// Monta assunto, HTML e texto simples do e-mail. Não envia nada (dá pra testar sozinho).
function buildOrderEmail(order, user) {
  const orderNumber = order._id.toString().slice(-6).toUpperCase();
  const firstName = String(user.name || "").trim().split(" ")[0] || "cliente";
  const address = formatAddress(order.address);

  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #E9E6DF; color: #1C1B22;">
            ${escapeHtml(item.name)}<br />
            <span style="color: #8B8894; font-size: 12px;">${item.qty} × ${formatBRL(item.price)}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #E9E6DF; text-align: right; color: #1C1B22; white-space: nowrap;">
            ${formatBRL(item.price * item.qty)}
          </td>
        </tr>`
    )
    .join("");

  const addressHtml = address
    ? `
      <p style="margin: 24px 0 4px; font-size: 13px; font-weight: 600; color: #1C1B22;">Endereço de entrega</p>
      <p style="margin: 0; font-size: 14px; color: #55525E; line-height: 1.5;">${escapeHtml(address).replace(/\n/g, "<br />")}</p>`
    : "";

  const html = `
    <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="margin: 0 0 8px; color: #1C1B22;">Pagamento confirmado!</h2>
      <p style="margin: 0 0 24px; color: #55525E;">
        Olá, ${escapeHtml(firstName)}. Recebemos o pagamento do seu pedido na PixelTech.
      </p>

      <div style="background: #F7F5F1; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <span style="color: #8B8894; font-size: 12px;">Pedido</span><br />
        <span style="font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #1C1B22;">#${orderNumber}</span><br />
        <span style="color: #8B8894; font-size: 12px;">Feito em ${formatDate(order.createdAt)}</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${itemsHtml}
        <tr>
          <td style="padding: 14px 0 0; font-weight: 700; color: #1C1B22;">Total</td>
          <td style="padding: 14px 0 0; text-align: right; font-weight: 700; color: #1C1B22;">${formatBRL(order.total)}</td>
        </tr>
      </table>
      ${addressHtml}

      <p style="margin: 28px 0 0; color: #8B8894; font-size: 12px;">
        Guarde este e-mail como comprovante. Se você não fez essa compra, responda esta mensagem.
      </p>
    </div>
  `;

  const textLines = [
    `Pagamento confirmado! Pedido #${orderNumber}`,
    `Olá, ${firstName}. Recebemos o pagamento do seu pedido na PixelTech.`,
    "",
    ...order.items.map((i) => `- ${i.name}: ${i.qty} x ${formatBRL(i.price)} = ${formatBRL(i.price * i.qty)}`),
    `Total: ${formatBRL(order.total)}`,
    ...(address ? ["", "Endereço de entrega:", address] : []),
  ];

  return {
    subject: `Pagamento confirmado — pedido #${orderNumber}`,
    html,
    text: textLines.join("\n"),
  };
}

async function sendOrderConfirmationEmail(order, user) {
  const { subject, html, text } = buildOrderEmail(order, user);

  await transporter.sendMail({
    from: `"PixelTech" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject,
    html,
    text,
  });
}

module.exports = { sendOrderConfirmationEmail, buildOrderEmail };