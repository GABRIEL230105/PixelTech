// Mercado Pago SIMULADO. Os testes decidem o que "o Mercado Pago responde".
const state = { payments: new Map(), paymentError: null, preferenceError: null, preferenceBody: null };

function reset() {
  state.payments.clear();
  state.paymentError = null;
  state.preferenceError = null;
  state.preferenceBody = null;
}

// Cadastra um pagamento que o Mercado Pago "conhece": setPayment("123", { external_reference, status, transaction_amount })
function setPayment(id, data) {
  state.payments.set(String(id), data);
}

class Preference {
  async create({ body }) {
    state.preferenceBody = body;
    if (state.preferenceError) throw state.preferenceError;
    return { init_point: "https://www.mercadopago.test/checkout/abc123", id: "pref-teste-1" };
  }
}

class Payment {
  async get({ id }) {
    if (state.paymentError) throw state.paymentError;
    const payment = state.payments.get(String(id));
    if (!payment) {
      const error = new Error("Payment not found");
      error.status = 404;
      throw error;
    }
    return payment;
  }
}

module.exports = { Preference, Payment, MercadoPagoConfig: class {}, __state: state, __reset: reset, __setPayment: setPayment };