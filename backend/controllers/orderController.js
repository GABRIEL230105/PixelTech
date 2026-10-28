const Order = require("../models/Order");
const buildOrderItems = require("../utils/buildOrderItems");
const { sendError } = require("../middleware/errorHandler");

const ADDRESS_FIELDS = ["street", "number", "neighborhood", "city", "state", "zip"];

// Pega o endereço de entrega salvo na CONTA do usuário (vem do banco, não do navegador).
// Tira espaços, descarta campos vazios e devolve undefined se a conta não tem endereço.
function getAccountAddress(user) {
  const raw = user.address && typeof user.address.toObject === "function" ? user.address.toObject() : user.address;
  if (!raw) return undefined;

  const clean = {};
  for (const field of ADDRESS_FIELDS) {
    const value = raw[field] == null ? "" : String(raw[field]).trim();
    if (value) clean[field] = value;
  }

  return Object.keys(clean).length > 0 ? clean : undefined;
}

module.exports = {
  // POST /api/orders — cria um pedido novo (status inicial: pendente)
  // O navegador manda só { items: [{ productId, qty }] }. Nomes, preços e total são
  // calculados aqui com o catálogo do servidor, e o endereço é o salvo na conta.
  async create(req, res) {
    const built = buildOrderItems(req.body.items);
    if (built.error) {
      return res.status(400).json({ error: built.error });
    }

    try {
      const order = await Order.create({
        user: req.user._id,
        items: built.items,
        address: getAccountAddress(req.user),
        total: built.total,
        status: "pendente",
      });

      res.status(201).json(order);
    } catch (error) {
      sendError(res, error, "Erro ao criar o pedido.");
    }
  },

  // GET /api/orders/my — lista os pedidos do usuário logado
  async myOrders(req, res) {
    try {
      const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      sendError(res, error, "Erro ao buscar os pedidos.");
    }
  },

  // GET /api/orders/:id — detalhe de um pedido, só se ele for do usuário logado
  async getOne(req, res) {
    try {
      const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }
      res.json(order);
    } catch (error) {
      sendError(res, error, "Erro ao buscar o pedido.");
    }
  },
};