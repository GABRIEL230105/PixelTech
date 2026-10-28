// Gera um código numérico de 6 dígitos (ex: "042817")
function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = generateOtpCode;