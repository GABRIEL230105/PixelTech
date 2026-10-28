const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendError } = require("./errorHandler");

// Exige um token JWT válido no header Authorization (Bearer <token>) e carrega o usuário em req.user
const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autorizado, token não enviado." });
  }

  const token = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    return res.status(401).json({ error: "Token inválido. Faça login novamente." });
  }

  try {
    const user = await User.findById(decoded.id).select("-password");

    // Token válido, mas a conta não existe mais (ex: foi apagada do banco)
    if (!user) {
      return res.status(401).json({ error: "Conta não encontrada. Faça login novamente." });
    }

    req.user = user;
    return next();
  } catch (error) {
    // Falha do banco não é "token inválido": devolve erro de servidor, não 401
    return sendError(res, error, "Erro ao validar o login.");
  }
};

module.exports = protect;