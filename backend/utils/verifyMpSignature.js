const crypto = require("crypto");

// Confere se a notificação veio mesmo do Mercado Pago, comparando o hash do
// header x-signature com um hash calculado aqui usando a chave secreta do webhook.
//
// O texto que é assinado segue o formato da documentação do Mercado Pago:
//   id:<data.id da URL em minúsculas>;request-id:<header x-request-id>;ts:<ts do x-signature>;
// Se algum desses itens não vier na notificação, ele é REMOVIDO do texto.
//
// Retorna { valid, reason } pra o log conseguir dizer por que foi recusada.
function verifyMpSignature({ xSignature, xRequestId, dataIdFromUrl, secret }) {
  if (!secret || !String(secret).trim()) return { valid: false, reason: "MP_WEBHOOK_SECRET vazio" };
  if (!xSignature) return { valid: false, reason: "sem header x-signature" };

  let ts = null;
  let v1 = null;

  for (const part of String(xSignature).split(",")) {
    const [key, value] = part.trim().split("=");
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }

  if (!ts || !v1) return { valid: false, reason: "x-signature malformado" };

  const parts = [];
  if (dataIdFromUrl) parts.push(`id:${String(dataIdFromUrl).toLowerCase()}`);
  if (xRequestId) parts.push(`request-id:${xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = parts.join(";") + ";";

  const expectedHash = crypto
    .createHmac("sha256", String(secret).trim())
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expectedHash);
  const b = Buffer.from(v1);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  return valid ? { valid: true } : { valid: false, reason: "hash diferente (chave secreta não confere)" };
}

module.exports = verifyMpSignature;