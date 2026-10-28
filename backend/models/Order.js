const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: String,
    number: String,
    neighborhood: String,
    city: String,
    state: String,
    zip: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    address: addressSchema,
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pendente", "pago", "enviado", "entregue", "cancelado"],
      default: "pendente",
    },
    // Guarda o id do pagamento no Mercado Pago, pra bater com o webhook depois
    paymentId: {
      type: String,
    },
    // Quando o e-mail de confirmação foi enviado. Serve de "trava" pra não mandar
    // o mesmo e-mail várias vezes (o Mercado Pago avisa mais de uma vez por pagamento).
    confirmationEmailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);