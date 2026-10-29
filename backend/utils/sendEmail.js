async function sendOtpEmail(to, code) {
  // Em vez de bloquear a rede com o Nodemailer, mostra o código nos logs do Render
  console.log(`\n========================================`);
  console.log(`[CÓDIGO OTP PARA ${to}]: ${code}`);
  console.log(`========================================\n`);
}

module.exports = sendOtpEmail;