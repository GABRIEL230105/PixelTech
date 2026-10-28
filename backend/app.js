const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Importação do Sentry (Versão 8+)
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

const leadsRouter = require("./routes/leads");
const authRouter = require("./routes/auth");
const otpRouter = require("./routes/otp");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Inicialização do Sentry (Deixe o DSN vazio até criar o projeto na plataforma)
Sentry.init({
  dsn: "", 
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
});

app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Pra conferir rápido se o servidor está no ar e conectado ao banco
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "sem conexão com o banco",
    database: dbConnected ? "conectado" : "desconectado",
  });
});

// Rota de teste para validar a integração (pode apagar depois)
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Meu primeiro erro Sentry!");
});

app.use("/api/leads", leadsRouter);
app.use("/api/auth", authRouter);
app.use("/api/otp", otpRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);

// Tratamento de rotas inexistentes
app.use(notFound);

// Configuração de erros do Sentry (Sintaxe da v8)
Sentry.setupExpressErrorHandler(app);

// Seu tratamento de erros final
app.use(errorHandler);

module.exports = app;