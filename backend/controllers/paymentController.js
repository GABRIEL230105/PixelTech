const mongoose = require("mongoose");
const { Preference, Payment } = require("mercadopago");
const mpClient = require("../utils/mercadoPago");
const Order = require("../models/Order");
const User = require("../models/User");
const verifyMpSignature = require("../utils/verifyMpSignature");
const { sendError } = require("../middleware/errorHandler");
const { sendOrderConfirmationEmail } = require("../utils/sendOrderEmail");

async function sendConfirmationOnce(orderId) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, status: "pago", confirmationEmailSentAt: null },
    { confirmationEmailSentAt: new Date() },
    { new: true }
  );

  if (!claimed) return;

  try {
    const user = await User.findById(claimed.user).select("name email");
    if (!user) throw new Error("usuário do pedido não encontrado");

    await sendOrderConfirmationEmail(claimed, user);
    console.log(`E-mail de confirmação enviado (pedido ${claimed._id}).`);
  } catch (error) {
    console.error(`Falha ao enviar o e-mail de confirmação (pedido ${claimed._id}):`, error.message);
    await Order.updateOne({ _id: claimed._id }, { confirmationEmailSentAt: null });
  }
}

// Consulta o pagamento direto na API do Mercado Pago e atualiza o pedido no banco
async function processPaymentById(dataId) {
  const payment = new Payment(mpClient);
  const paymentInfo = await payment.get({ id: dataId });

  const orderId = paymentInfo.external_reference;
  const mpStatus = paymentInfo.status;

  if (!orderId || !mongoose.isValidObjectId(orderId)) {
    console.warn(`Pagamento ${dataId} sem referência de pedido válida.`);
    return null;
  }

  const order = await Order.findById(orderId);
  if (!order) {
    console.warn(`Pedido não encontrado para o pagamento ${dataId}: ${orderId}`);
    return null;
  }

  const amountMatches = Math.abs(paymentInfo.transaction_amount - order.total) < 0.01;

  if (mpStatus === "approved" && !amountMatches) {
    console.error(
      `Valor do pagamento (${paymentInfo.transaction_amount}) não bate com o pedido ${orderId} (${order.total})`
    );
    order.status = "cancelado";
    order.paymentId = String(dataId);
    await order.save();
    return order;
  }

  const statusMap = {
    approved: "pago",
    rejected: "cancelado",
    pending: "pendente",
    in_process: "pendente",
    cancelled: "cancelado",
    refunded: "cancelado",
    charged_back: "cancelado",
  };

  const newStatus = statusMap[mpStatus] || "pendente";
  const paymentId = String(dataId);

  if (newStatus === "pago" || mpStatus === "refunded" || mpStatus === "charged_back") {
    await Order.updateOne({ _id: order._id }, { status: newStatus, paymentId });
  } else {
    await Order.updateOne(
      { _id: order._id, status: "pendente" },
      { status: newStatus, paymentId }
    );
  }

  if (newStatus === "pago") {
    await sendConfirmationOnce(order._id);
  }

  return Order.findById(order._id);
}

module.exports = {
  // POST /api/payments/create-preference
  async createPreference(req, res) {
    const { orderId } = req.body;

    if (typeof orderId !== "string" || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Informe um orderId válido." });
    }

    try {
      const order = await Order.findOne({ _id: orderId, user: req.user._id });
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      if (order.status !== "pendente") {
        return res.status(400).json({ error: "Esse pedido não está mais aguardando pagamento." });
      }

      const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
      const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
      const preference = new Preference(mpClient);

      const preferenceBody = {
        items: order.items.map((item) => ({
          title: item.name,
          quantity: item.qty,
          unit_price: item.price,
          currency_id: "BRL",
        })),
        external_reference: order._id.toString(),
        back_urls: {
          success: `${frontendUrl}/`,
          failure: `${frontendUrl}/`,
          pending: `${frontendUrl}/`,
        },
        auto_return: "approved",
      };

      if (backendUrl) {
        preferenceBody.notification_url = `${backendUrl}/api/payments/webhook`;
      }

      const result = await preference.create({ body: preferenceBody });

      res.status(200).json({
        init_point: result.init_point,
        preferenceId: result.id,
      });
    } catch (error) {
      sendError(res, error, "Erro ao criar a preferência de pagamento.", { exposeDetails: true });
    }
  },

  // POST /api/payments/sync — confirma na hora quando o cliente volta do checkout
  async syncPayment(req, res) {
    try {
      const paymentId = req.body?.paymentId || req.query?.payment_id;
      if (!paymentId) {
        return res.status(400).json({ error: "Informe o paymentId." });
      }

      const updatedOrder = await processPaymentById(String(paymentId));
      if (!updatedOrder) {
        return res.status(404).json({ error: "Pedido não encontrado para este pagamento." });
      }

      res.json({ order: updatedOrder });
    } catch (error) {
      sendError(res, error, "Não foi possível sincronizar o status do pagamento.");
    }
  },

  // POST /api/payments/webhook — chamado automaticamente pelo Mercado Pago
  async webhook(req, res) {
    try {
      const type = req.body?.type || req.query?.type || req.query?.topic;
      const dataIdFromUrl = req.query["data.id"] || req.query.id;
      const dataId = dataIdFromUrl || req.body?.data?.id;

      if (type !== "payment" || !dataId) {
        return res.sendStatus(200);
      }

      const skipSignature =
        process.env.MP_VERIFY_SIGNATURE === "false" || !process.env.MP_WEBHOOK_SECRET;

      if (!skipSignature) {
        const check = verifyMpSignature({
          xSignature: req.headers["x-signature"],
          xRequestId: req.headers["x-request-id"],
          dataIdFromUrl,
          secret: process.env.MP_WEBHOOK_SECRET,
        });

        if (!check.valid) {
          console.warn(`Webhook ignorado, assinatura inválida: ${check.reason}`);
          return res.sendStatus(401);
        }
      }

      await processPaymentById(dataId);
      res.sendStatus(200);
    } catch (error) {
      if (error && error.status === 404) {
        console.warn("Webhook ignorado: pagamento não encontrado no Mercado Pago.");
        return res.sendStatus(200);
      }
      console.error("Erro no webhook do Mercado Pago:", error);
      res.sendStatus(500);
    }
  },
};