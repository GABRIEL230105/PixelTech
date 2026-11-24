const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const INITIAL_PRODUCTS = require("./seed/initialProducts");

const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

const leadsRouter = require("./routes/Leads");
const authRouter = require("./routes/auth");
const otpRouter = require("./routes/otp");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const Lead = require("./models/Lead");
const Order = require("./models/Order");
const User = require("./models/User");
const Product = require("./models/Product");

const app = express();

app.set("trust proxy", 1);

Sentry.init({
  dsn: "",
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
});

app.use(cors());
app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: { error: "Muitos pedidos realizados a partir deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use(express.json({ limit: "100kb" }));

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

// Função auxiliar para validar se o usuário logado é o administrador
async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Faça login para acessar o painel administrativo." });
    return null;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decoded.id || decoded._id || decoded.userId;
  const currentUser = userId ? await User.findById(userId).lean() : null;
  const userEmail = (currentUser?.email || decoded.email || "").toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!adminEmail || userEmail !== adminEmail) {
    res.status(403).json({ error: "Acesso restrito ao administrador da loja." });
    return null;
  }

  return currentUser || decoded;
}

// Importa automaticamente os 80 produtos iniciais se a coleção estiver vazia
async function seedInitialProductsIfEmpty() {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const count = await Product.countDocuments();
    if (count === 0) {
      await Product.insertMany(INITIAL_PRODUCTS);
      console.log("[seed] 80 produtos iniciais importados para o MongoDB.");
    }
  } catch (err) {
    console.error("[seed] Erro ao importar produtos iniciais:", err.message);
  }
}

mongoose.connection.once("open", seedInitialProductsIfEmpty);
if (mongoose.connection.readyState === 1) {
  seedInitialProductsIfEmpty();
}

// Rota administrativa opcional para importar os 80 produtos padrão sem duplicar
app.post("/api/products/seed", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const existing = await Product.find({}, { id: 1 }).lean();
    const existingIds = new Set(existing.map((p) => p.id));
    const missing = INITIAL_PRODUCTS.filter((p) => !existingIds.has(p.id));

    if (missing.length > 0) {
      await Product.insertMany(missing);
    }

    res.json({ imported: missing.length, total: existing.length + missing.length });
  } catch (err) {
    console.error("Erro ao importar catálogo padrão:", err);
    res.status(500).json({ error: "Não foi possível importar os produtos padrão." });
  }
});

// Lista produtos cadastrados no banco (público para a vitrine da loja)
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1, id: 1 }).lean();
    res.json({ products });
  } catch (err) {
    console.error("Erro ao listar produtos:", err);
    res.status(500).json({ error: "Erro ao carregar produtos." });
  }
});

// Cadastra novo produto (apenas administrador)
app.post("/api/products", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { name, price, oldPrice, category, image, badge, description } = req.body;

    if (!name || !category || !image || price === undefined || Number(price) <= 0) {
      return res.status(400).json({ error: "Preencha nome, categoria, imagem e um preço válido." });
    }

    const lastProduct = await Product.findOne().sort({ id: -1 }).lean();
    const nextId = lastProduct && lastProduct.id >= 1001 ? lastProduct.id + 1 : 1001;

    const created = await Product.create({
      id: nextId,
      name: String(name).trim(),
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      category: String(category).trim(),
      image: String(image).trim(),
      badge: badge ? String(badge).trim() : "Novo",
      description: description ? String(description).trim() : "",
    });

    res.status(201).json({ product: created });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    console.error("Erro ao cadastrar produto:", err);
    res.status(500).json({ error: "Não foi possível cadastrar o produto." });
  }
});

// Edita produto cadastrado no banco (apenas administrador)
app.put("/api/products/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { name, price, oldPrice, category, image, badge, description } = req.body;

    if (!name || !category || !image || price === undefined || Number(price) <= 0) {
      return res.status(400).json({ error: "Preencha nome, categoria, imagem e um preço válido." });
    }

    const rawId = req.params.id;
    const filter = mongoose.isValidObjectId(rawId)
      ? { _id: rawId }
      : { id: Number(rawId) };

    const updated = await Product.findOneAndUpdate(
      filter,
      {
        name: String(name).trim(),
        price: Number(price),
        oldPrice: oldPrice ? Number(oldPrice) : null,
        category: String(category).trim(),
        image: String(image).trim(),
        badge: badge !== undefined ? String(badge).trim() : "",
        description: description !== undefined ? String(description).trim() : "",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    res.json({ product: updated });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    console.error("Erro ao editar produto:", err);
    res.status(500).json({ error: "Não foi possível atualizar o produto." });
  }
});

// Remove produto cadastrado no banco (apenas administrador)
app.delete("/api/products/:id", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const rawId = req.params.id;
    const filter = mongoose.isValidObjectId(rawId)
      ? { _id: rawId }
      : { id: Number(rawId) };

    const deleted = await Product.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    res.json({ ok: true, message: "Produto removido com sucesso." });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    console.error("Erro ao remover produto:", err);
    res.status(500).json({ error: "Não foi possível remover o produto." });
  }
});

// Área de consulta e administração protegida (RF20)
app.get("/api/consulta", async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const [orders, leads, users, products] = await Promise.all([
      Order.find().populate("user", "name email").sort({ createdAt: -1 }).lean(),
      Lead.find().sort({ createdAt: -1 }).lean(),
      User.find().select("-password -senha -passwordHash").sort({ createdAt: -1 }).lean(),
      Product.find().sort({ createdAt: -1, id: 1 }).lean(),
    ]);

    res.json({ orders, leads, users, products });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
    }
    console.error("Erro ao carregar área de consulta:", err);
    res.status(500).json({ error: "Não foi possível carregar os registros." });
  }
});

app.use(notFound);
Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

module.exports = app;