const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

const leadsRouter = require("./routes/Leads");
const authRouter = require("./routes/auth");
const otpRouter = require("./routes/otp");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Configuração necessária para o Render (corrige o erro do rate-limit)
app.set('trust proxy', 1);

// Inicialização do Sentry
Sentry.init({
  dsn: "", 
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
});

app.use(cors());

// Proteção de cabeçalhos HTTP contra vulnerabilidades comuns
app.use(helmet());

// Prevenção de ataques de força bruta e DDoS (Rate Limiting)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 150, // Limite de 150 pedidos por IP a cada 15 minutos
  message: { error: "Muitos pedidos realizados a partir deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplica o limite de taxa a todas as rotas que começam por /api
app.use("/api", apiLimiter);

// Parse de JSON (mantido com limite de 100kb para evitar sobrecarga de memória)
app.use(express.json({ limit: "100kb" }));

// Pra conferir rápido se o servidor está no ar e conectado ao banco
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "sem conexão com o banco",
    database: dbConnected ? "conectado" : "desconectado",
  });
});

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

// Configuração de erros do Sentry
Sentry.setupExpressErrorHandler(app);

// Seu tratamento de erros final
app.use(errorHandler);

module.exports = app;