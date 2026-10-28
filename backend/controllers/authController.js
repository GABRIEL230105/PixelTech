const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendError } = require("../middleware/errorHandler");

const isText = (v) => typeof v === "string" && v.trim() !== "";

module.exports = {
  // POST /api/auth/register
  async register(req, res) {
    const { name, email, password, address } = req.body;

    // Só texto: objetos como { "$ne": null } nunca podem chegar numa busca do banco
    if (!isText(name) || !isText(email) || !isText(password)) {
      return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
    }

    try {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: "Já existe uma conta com esse e-mail." });
      }

      const user = await User.create({ name, email, password, address });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        token: generateToken(user._id),
      });
    } catch (error) {
      sendError(res, error, "Erro ao criar a conta.");
    }
  },

  // POST /api/auth/login
  async login(req, res) {
    const { email, password } = req.body;

    if (!isText(email) || !isText(password)) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: "E-mail ou senha inválidos." });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: "E-mail ou senha inválidos." });
      }

      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        address: user.address,
        token: generateToken(user._id),
      });
    } catch (error) {
      sendError(res, error, "Erro ao fazer login.");
    }
  },

  // GET /api/auth/me (rota protegida, exige token)
  async me(req, res) {
    res.json(req.user);
  },
};