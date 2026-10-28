// O dotenv precisa carregar ANTES de qualquer outro arquivo do projeto, porque
// alguns (e-mail, Mercado Pago) leem o .env assim que são importados.
require("dotenv").config();

const mongoose = require("mongoose");
const { checkEnv } = require("./utils/checkEnv");

checkEnv();

const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/projeto_integrador";

// "Desconectou" só faz sentido depois que chegou a conectar (na falha inicial o erro já é mostrado abaixo)
let everConnected = false;
mongoose.connection.on("connected", () => { everConnected = true; });
mongoose.connection.on("disconnected", () => {
  if (everConnected) console.warn("MongoDB desconectou. Tentando reconectar...");
});
mongoose.connection.on("reconnected", () => console.log("MongoDB reconectado."));
mongoose.connection.on("error", (err) => console.error("Erro na conexão com o MongoDB:", err.message));

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Conectado ao MongoDB");
    app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Erro ao conectar no MongoDB:", err.message);
    process.exit(1);
  });