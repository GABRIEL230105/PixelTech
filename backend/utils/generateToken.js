const jwt = require("jsonwebtoken");

// Gera um token JWT que expira em 30 dias, contendo o id do usuário
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = generateToken;