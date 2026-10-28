const mongoose = require("mongoose");
const { Preference, Payment } = require("mercadopago");
const mpClient = require("../utils/mercadoPago");
const Order = require("../models/Order");
const User = require("../models/User");
const verifyMpSignature = require("../utils/verifyMpSignature");
const { sendError } = require("../middleware/errorHandler");
const { sendOrderConfirmationEmail } = require("../utils/sendOrderEmail");

// Envia o e-mail de confirmação no máximo uma vez por pedido.
// O Mercado Pago manda várias notificações quase ao mesmo tempo, então a "trava"
// é feita numa única operação no banco: só uma das chamadas consegue marcar
// confirmationEmailSentAt (as outras não encontram o pedido com o campo vazio).
async function sendConfirmationOnce(orderId) {
  const claimed = await Order.findOneAndUpdate(
    { _id: orderId, status: "pago", confirmationEmailSentAt: null },
    { confirmationEmailSentAt: new Date() },
    { new: true }
  );

  if (!claimed) return; // já enviado, ou outra notificação está enviando agora

  try {
    const user = await User.findById(claimed.user).select("name email");
    if (!user) throw new Error("usuário do pedido não encontrado");

    await sendOrderConfirmationEmail(claimed, user);
    console.log(`E-mail de confirmação enviado (pedido ${claimed._id}).`);
  } catch (error) {
    console.error(`Falha ao enviar o e-mail de confirmação (pedido ${claimed._id}):`, error.message);
    // Solta a trava pra uma próxima notificação poder tentar de novo
    await Order.updateOne({ _id: claimed._id }, { confirmationEmailSentAt: null });
  }
}

module.exports = {
  // POST /api/payments/create-preference
  // Recebe o id de um pedido já criado e devolve o link de checkout do Mercado Pago
  async createPreference(req, res) {
    const { orderId } = req.body;

    if (typeof orderId !== "string" || !mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ error: "Informe um orderId válido." });
    }

    try {
      // Só gera o pagamento de um pedido que é do próprio usuário logado
      const order = await Order.findOne({ _id: orderId, user: req.user._id });
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      if (order.status !== "pendente") {
        return res.status(400).json({ error: "Esse pedido não está mais aguardando pagamento." });
      }

      const preference = new Preference(mpClient);

      const result = await preference.create({
        body: {
          items: order.items.map((item) => ({
            title: item.name,
            quantity: item.qty,
            unit_price: item.price,
            currency_id: "BRL",
          })),
          external_reference: order._id.toString(),
          back_urls: {
            success: "http://localhost:5173/pagamento/sucesso",
            failure: "http://localhost:5173/pagamento/falha",
            pending: "http://localhost:5173/pagamento/pendente",
          },
          notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
        },
      });

      res.status(200).json({
        init_point: result.init_point,
        preferenceId: result.id,
      });
    } catch (error) {
      // Em desenvolvimento, devolve também o motivo dado pelo Mercado Pago (ex: credencial recusada)
      sendError(res, error, "Erro ao criar a preferência de pagamento.", { exposeDetails: true });
    }
  },

  // POST /api/payments/webhook
  // O Mercado Pago chama essa rota sozinho toda vez que o status de um pagamento muda
  async webhook(req, res) {
    try {
      const { type, data } = req.body;
      // O id da URL (?data.id=...&type=payment) é o que entra na conta da assinatura.
      // Pra buscar o pagamento, se ele não vier na URL, usamos o do corpo da requisição.
      const dataIdFromUrl = req.query["data.id"];
      const dataId = dataIdFromUrl || (data && data.id);

      // Só nos interessa notificação do tipo "payment"
      if (type !== "payment" || !dataId) {
        return res.sendStatus(200);
      }

      // 1) Confere se a notificação é mesmo do Mercado Pago.
      // Só dá pra desligar em desenvolvimento, com MP_VERIFY_SIGNATURE=false no .env.
      const skipSignature =
        process.env.MP_VERIFY_SIGNATURE === "false" && process.env.NODE_ENV !== "production";

      if (skipSignature) {
        console.warn(
          "Verificação de assinatura do webhook DESLIGADA (MP_VERIFY_SIGNATURE=false). Use só em desenvolvimento."
        );
      } else {
        const check = verifyMpSignature({
          xSignature: req.headers["x-signature"],
          xRequestId: req.headers["x-request-id"],
          dataIdFromUrl,
          secret: process.env.MP_WEBHOOK_SECRET,
        });

        if (!check.valid) {
          console.warn(
            `Webhook do Mercado Pago ignorado, assinatura inválida: ${check.reason} ` +
              `(id na URL: ${dataIdFromUrl ? "sim" : "não"}, x-request-id: ${
                req.headers["x-request-id"] ? "sim" : "não"
              })`
          );
          return res.sendStatus(401);
        }
      }

      // 2) Busca os dados reais do pagamento direto na API do Mercado Pago
      // (nunca confia só no que veio na notificação)
      const payment = new Payment(mpClient);
      const paymentInfo = await payment.get({ id: dataId });

      const orderId = paymentInfo.external_reference;
      const mpStatus = paymentInfo.status; // approved | rejected | pending | in_process...

      // Pagamento que não foi criado por este sistema (sem referência de pedido válida): ignora
      if (!orderId || !mongoose.isValidObjectId(orderId)) {
        console.warn(`Webhook ignorado: pagamento ${dataId} sem referência de pedido válida.`);
        return res.sendStatus(200);
      }

      const order = await Order.findById(orderId);
      if (!order) {
        console.warn(`Webhook recebido para um pedido que não existe: ${orderId}`);
        return res.sendStatus(200);
      }

      // 3) Confere se o valor pago bate com o valor do pedido (evita pagar
      // menos do que o combinado e ainda assim o pedido ser liberado)
      const amountMatches = Math.abs(paymentInfo.transaction_amount - order.total) < 0.01;

      if (mpStatus === "approved" && !amountMatches) {
        console.error(
          `Valor do pagamento (${paymentInfo.transaction_amount}) não bate com o pedido ${orderId} (${order.total})`
        );
        order.status = "cancelado";
        order.paymentId = String(dataId);
        await order.save();
        return res.sendStatus(200);
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
        // Pagamento aprovado, ou devolvido depois de pago: sempre vale
        await Order.updateOne({ _id: order._id }, { status: newStatus, paymentId });
      } else {
        // "Pendente" ou tentativa recusada: só mexe se o pedido ainda está pendente.
        // Assim uma notificação atrasada (ex: de uma tentativa com cartão recusado,
        // antes da compra ser paga por outro meio) não desfaz um pedido já pago.
        await Order.updateOne(
          { _id: order._id, status: "pendente" },
          { status: newStatus, paymentId }
        );
      }

      if (newStatus === "pago") {
        await sendConfirmationOnce(order._id);
      }

      res.sendStatus(200);
    } catch (error) {
      // Pagamento que o Mercado Pago não conhece (ex: notificação de teste com id inventado):
      // não adianta tentar de novo
      if (error && error.status === 404) {
        console.warn("Webhook ignorado: pagamento não encontrado no Mercado Pago (id de teste?).");
        return res.sendStatus(200);
      }

      // Falha inesperada (ex: banco fora do ar por um instante): responde 500 pro Mercado Pago
      // tentar de novo mais tarde. Se respondesse 200, o pedido ficaria "pendente" pra sempre.
      console.error("Erro no webhook do Mercado Pago:", error);
      res.sendStatus(500);
    }
  },
};