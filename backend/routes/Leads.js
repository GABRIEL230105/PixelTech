const express = require("express");
const router = express.Router();
const Lead = require("../models/User");
 
// POST /api/leads — cria um novo lead
router.post("/", async (req, res) => {
  try {
    const { nome, email, telefone } = req.body;
 
    if (!nome || !email || !telefone) {
      return res.status(400).json({ error: "Preencha nome, e-mail e telefone." });
    }
 
    const lead = new Lead({ nome, email, telefone });
    await lead.save();
 
    res.status(201).json({ message: "Lead cadastrado com sucesso!", lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar o lead." });
  }
});
 
// GET /api/leads — lista todos os leads (útil pra conferir se está salvando)
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar os leads." });
  }
});
 
module.exports = router;
 