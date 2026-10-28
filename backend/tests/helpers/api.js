const crypto = require("crypto");
const request = require("supertest");
const fakeDb = require("./fakeDb"); // precisa ser carregado antes de usar o app (troca o banco)
const app = require("../../app");

let counter = 0;

// Cria uma conta de verdade pela API e devolve o token
async function registerUser(overrides = {}) {
  counter += 1;
  const body = {
    name: "Ana Souza",
    email: `ana${counter}@teste.com`,
    password: "123456",
    address: { street: "Rua das Flores", number: "123", neighborhood: "Centro", city: "Parintins", state: "AM", zip: "69151-000" },
    ...overrides,
  };
  const res = await request(app).post("/api/auth/register").send(body);
  return { res, body, token: res.body.token, id: res.body._id };
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Cria um pedido de verdade pela API
async function createOrder(token, items = [{ productId: 2, qty: 1 }]) {
  const res = await request(app).post("/api/orders").set(auth(token)).send({ items });
  return res;
}

// Cabeçalhos de assinatura de um webhook, calculados como o Mercado Pago calcula
function signWebhook({ dataId, requestId = "req-1", secret = process.env.MP_WEBHOOK_SECRET, ts = "1742505638683" }) {
  const hash = crypto.createHmac("sha256", secret).update(`id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
  return { "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": requestId };
}

// Dispara uma notificação do Mercado Pago (assinada por padrão)
function sendWebhook({ dataId, type = "payment", headers } = {}) {
  return request(app)
    .post(`/api/payments/webhook?data.id=${dataId}&type=${type}`)
    .set(headers || signWebhook({ dataId }))
    .send({ type, data: { id: String(dataId) } });
}

module.exports = { app, request, fakeDb, registerUser, createOrder, auth, signWebhook, sendWebhook };