const bcrypt = require("bcryptjs");
const Otp = require("../models/Otp");
const User = require("../models/User");
const generateOtpCode = require("../utils/generateOtpCode");
const sendOtpEmail = require("../utils/sendEmail");
const { sendError } = require("../middleware/errorHandler");

const CODE_EXPIRATION_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const isText = (v) => typeof v === "string" && v.trim() !== "";
const EMAIL_FORMAT = /^\S+@\S+\.\S+$/;

async function createAndSendCode(email) {
  const code = generateOtpCode();
  const salt = await bcrypt.genSalt(10);
  const codeHash = await bcrypt.hash(code, salt);
  const expiresAt = new Date(Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000);

  // Remove qualquer código antigo desse e-mail antes de criar um novo (reenvio invalida o anterior)
  await Otp.deleteMany({ email });

  await Otp.create({ email, codeHash, expiresAt, attempts: 0 });
  await sendOtpEmail(email, code);
}

module.exports = {
  // POST /api/otp/send — gera e envia o código pela primeira vez
  async send(req, res) {
    const { email } = req.body;
    if (!isText(email)) {
      return res.status(400).json({ error: "Informe o e-mail." });
    }
    if (!EMAIL_FORMAT.test(email.trim())) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    try {
      await createAndSendCode(email);
      res.status(200).json({ message: "Código enviado para o seu e-mail." });
    } catch (error) {
      sendError(res, error, "Não foi possível enviar o código.");
    }
  },

  // POST /api/otp/resend — igual ao send, mas semanticamente é o botão "reenviar"
  async resend(req, res) {
    const { email } = req.body;
    if (!isText(email)) {
      return res.status(400).json({ error: "Informe o e-mail." });
    }
    if (!EMAIL_FORMAT.test(email.trim())) {
      return res.status(400).json({ error: "E-mail inválido." });
    }

    try {
      await createAndSendCode(email);
      res.status(200).json({ message: "Novo código enviado." });
    } catch (error) {
      sendError(res, error, "Não foi possível reenviar o código.");
    }
  },

  // POST /api/otp/verify — confirma o código digitado
  async verify(req, res) {
    const { email, code } = req.body;
    if (!isText(email) || !isText(code)) {
      return res.status(400).json({ error: "Informe e-mail e código." });
    }

    try {
      const otp = await Otp.findOne({ email }).sort({ createdAt: -1 });

      if (!otp) {
        return res.status(400).json({ error: "Nenhum código pendente para esse e-mail. Peça um novo." });
      }

      if (otp.expiresAt < new Date()) {
        await Otp.deleteOne({ _id: otp._id });
        return res.status(400).json({ error: "Código expirado. Peça um novo." });
      }

      if (otp.attempts >= MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: otp._id });
        return res.status(429).json({ error: "Muitas tentativas erradas. Peça um novo código." });
      }

      const isMatch = await bcrypt.compare(code, otp.codeHash);

      if (!isMatch) {
        otp.attempts += 1;
        await otp.save();
        const remaining = MAX_ATTEMPTS - otp.attempts;
        return res.status(400).json({
          error: `Código incorreto. Tentativas restantes: ${remaining}.`,
        });
      }

      // Código certo: marca o usuário como verificado (se existir) e apaga o OTP usado
      await User.updateOne({ email }, { emailVerified: true });
      await Otp.deleteOne({ _id: otp._id });

      res.status(200).json({ message: "E-mail verificado com sucesso!" });
    } catch (error) {
      sendError(res, error, "Erro ao verificar o código.");
    }
  },
};