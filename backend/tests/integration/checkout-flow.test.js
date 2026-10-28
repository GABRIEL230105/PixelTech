// A jornada inteira de uma compra, de ponta a ponta, só pela API:
// cadastro -> código no e-mail -> login -> pedido -> link de pagamento -> webhook -> pedido pago + e-mail.
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const mp = require("../helpers/mercadoPagoMock");
const sendOtpEmail = require("../../utils/sendEmail");
const { sendOrderConfirmationEmail } = require("../../utils/sendOrderEmail");
const { app, request, fakeDb, auth, sendWebhook } = require("../helpers/api");

beforeEach(() => {
  fakeDb.reset();
  mp.__reset();
});

test("compra completa: da criação da conta ao pedido pago com e-mail de confirmação", async () => {
  const email = "gabriel@teste.com";

  // 1. Cria a conta (com endereço)
  const cadastro = await request(app)
    .post("/api/auth/register")
    .send({ name: "Gabriel Mendes", email, password: "minha-senha", address: { street: "Rua das Flores", number: "123", city: "Parintins", state: "AM", zip: "69151-000" } });
  expect(cadastro.status).toBe(201);

  // 2. Recebe o código por e-mail (o envio é simulado: pegamos o código que seria enviado)
  expect((await request(app).post("/api/otp/send").send({ email })).status).toBe(200);
  const [destino, codigo] = sendOtpEmail.mock.calls.at(-1);
  expect(destino).toBe(email);

  // 3. Erra o código uma vez e depois acerta
  const errado = await request(app).post("/api/otp/verify").send({ email, code: codigo === "000000" ? "111111" : "000000" });
  expect(errado.body.error).toBe("Código incorreto. Tentativas restantes: 4.");
  expect((await request(app).post("/api/otp/verify").send({ email, code: codigo })).status).toBe(200);
  expect(fakeDb.store.User[0].emailVerified).toBe(true);

  // 4. Entra com e-mail e senha
  const login = await request(app).post("/api/auth/login").send({ email, password: "minha-senha" });
  expect(login.status).toBe(200);
  const token = login.body.token;

  // 5. Cria o pedido, tentando mandar um preço falso
  const pedido = await request(app)
    .post("/api/orders")
    .set(auth(token))
    .send({ items: [{ productId: 2, qty: 1, price: 1 }, { productId: 3, qty: 2 }], total: 3 });
  expect(pedido.status).toBe(201);
  expect(pedido.body.total).toBe(588);
  expect(pedido.body.address).toMatchObject({ street: "Rua das Flores", city: "Parintins" });

  // 6. Gera o link de pagamento: o Mercado Pago recebe os preços reais
  const preferencia = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: pedido.body._id });
  expect(preferencia.status).toBe(200);
  expect(preferencia.body.init_point).toMatch(/^https:\/\/www\.mercadopago\.test\//);
  expect(mp.__state.preferenceBody.items.map((i) => i.unit_price)).toEqual([289, 149.5]);
  expect(mp.__state.preferenceBody.external_reference).toBe(pedido.body._id);

  // 7. A pessoa paga; o Mercado Pago avisa 4 vezes ao mesmo tempo
  mp.__setPayment("777", { external_reference: pedido.body._id, status: "approved", transaction_amount: 588 });
  const avisos = await Promise.all(Array.from({ length: 4 }, () => sendWebhook({ dataId: "777" })));
  avisos.forEach((r) => expect(r.status).toBe(200));

  // 8. O pedido aparece como pago e o e-mail de confirmação saiu uma vez só
  const meusPedidos = await request(app).get("/api/orders/my").set(auth(token));
  expect(meusPedidos.body).toHaveLength(1);
  expect(meusPedidos.body[0]).toMatchObject({ status: "pago", paymentId: "777", total: 588 });

  expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  const [pedidoDoEmail, destinatario] = sendOrderConfirmationEmail.mock.calls[0];
  expect(pedidoDoEmail.total).toBe(588);
  expect(destinatario.email).toBe(email);

  // 9. Outra pessoa não enxerga esse pedido
  const outra = await request(app).post("/api/auth/register").send({ name: "Beto", email: "beto@teste.com", password: "123456" });
  const espiando = await request(app).get(`/api/orders/${pedido.body._id}`).set(auth(outra.body.token));
  expect(espiando.status).toBe(404);
});