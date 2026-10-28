// Pagamento: geração do link do Mercado Pago e o webhook que confirma o pedido.
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const mp = require("../helpers/mercadoPagoMock");
const { sendOrderConfirmationEmail } = require("../../utils/sendOrderEmail"); // simulado
const { app, request, fakeDb, registerUser, createOrder, auth, signWebhook, sendWebhook } = require("../helpers/api");

beforeEach(() => {
  fakeDb.reset();
  mp.__reset();
});

// Cria uma conta e um pedido pendente de verdade pela API
async function novoPedido(items) {
  const user = await registerUser();
  const { body: order } = await createOrder(user.token, items);
  return { ...user, order };
}

// Diz ao Mercado Pago simulado que o pagamento existe, com este status e valor
function registrarPagamento(order, { id = "1001", status = "approved", amount } = {}) {
  mp.__setPayment(id, { external_reference: order._id, status, transaction_amount: amount ?? order.total });
}

const pedidoNoBanco = () => fakeDb.store.Order[0];

describe("POST /api/payments/create-preference", () => {
  test("gera o link de pagamento mandando ao Mercado Pago os itens e preços do pedido", async () => {
    const { token, order } = await novoPedido([{ productId: 2, qty: 1 }, { productId: 3, qty: 2 }]);
    const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: order._id });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ init_point: "https://www.mercadopago.test/checkout/abc123", preferenceId: "pref-teste-1" });

    const enviado = mp.__state.preferenceBody;
    expect(enviado.items).toEqual([
      { title: "Teclado Mecânico Nimbus", quantity: 1, unit_price: 289, currency_id: "BRL" },
      { title: "Mouse Vertex 2", quantity: 2, unit_price: 149.5, currency_id: "BRL" },
    ]);
    expect(enviado.external_reference).toBe(order._id);
    expect(enviado.notification_url).toBe(`${process.env.BACKEND_URL}/api/payments/webhook`);
  });

  test("exige login", async () => {
    const res = await request(app).post("/api/payments/create-preference").send({ orderId: "6acc4b26bb7f99b205994209" });
    expect(res.status).toBe(401);
  });

  test.each([
    ["sem orderId", {}],
    ["orderId com formato inválido", { orderId: "abc" }],
    ["orderId em forma de objeto", { orderId: { $ne: null } }],
    ["orderId como número", { orderId: 123 }],
  ])("recusa pedido de pagamento %s", async (_nome, corpo) => {
    const { token } = await registerUser();
    const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send(corpo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Informe um orderId válido.");
    expect(mp.__state.preferenceBody).toBeNull();
  });

  test("não gera pagamento de um pedido de outra pessoa (404)", async () => {
    const dona = await novoPedido();
    const outra = await registerUser({ name: "Beto" });
    const res = await request(app).post("/api/payments/create-preference").set(auth(outra.token)).send({ orderId: dona.order._id });
    expect(res.status).toBe(404);
    expect(mp.__state.preferenceBody).toBeNull();
  });

  test("pedido que não existe: 404", async () => {
    const { token } = await registerUser();
    const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: "6acc4b26bb7f99b205994209" });
    expect(res.status).toBe(404);
  });

  test("pedido que já foi pago não gera um novo pagamento", async () => {
    const { token, order } = await novoPedido();
    pedidoNoBanco().status = "pago";
    const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: order._id });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Esse pedido não está mais aguardando pagamento.");
    expect(mp.__state.preferenceBody).toBeNull();
  });

  describe("quando o Mercado Pago recusa a credencial", () => {
    const recusa = () => Object.assign(new Error("At least one policy returned UNAUTHORIZED."), { status: 403 });

    test("em desenvolvimento: 500 com o motivo, pra facilitar o diagnóstico", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      const { token, order } = await novoPedido();
      mp.__state.preferenceError = recusa();
      const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: order._id });
      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Erro ao criar a preferência de pagamento.");
      expect(res.body.details).toMatch(/UNAUTHORIZED/);
    });

    test("em produção: 500 SEM detalhes internos", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      const { token, order } = await novoPedido();
      mp.__state.preferenceError = recusa();
      process.env.NODE_ENV = "production";
      try {
        const res = await request(app).post("/api/payments/create-preference").set(auth(token)).send({ orderId: order._id });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "Erro ao criar a preferência de pagamento." });
      } finally {
        process.env.NODE_ENV = "test";
      }
    });
  });
});

describe("webhook: pagamento aprovado", () => {
  test("marca o pedido como pago, guarda o paymentId e envia o e-mail de confirmação ao dono", async () => {
    const { order, body } = await novoPedido();
    registrarPagamento(order, { id: "1001" });

    const res = await sendWebhook({ dataId: "1001" });

    expect(res.status).toBe(200);
    expect(pedidoNoBanco()).toMatchObject({ status: "pago", paymentId: "1001" });
    expect(pedidoNoBanco().confirmationEmailSentAt).toBeInstanceOf(Date);

    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    const [pedidoDoEmail, destinatario] = sendOrderConfirmationEmail.mock.calls[0];
    expect(String(pedidoDoEmail._id)).toBe(order._id);
    expect(pedidoDoEmail.status).toBe("pago");
    expect(destinatario.email).toBe(body.email);
  });

  test("o Mercado Pago manda 4 notificações ao mesmo tempo: o e-mail sai UMA vez só", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order);

    const respostas = await Promise.all(Array.from({ length: 4 }, () => sendWebhook({ dataId: "1001" })));

    respostas.forEach((r) => expect(r.status).toBe(200));
    expect(pedidoNoBanco().status).toBe("pago");
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  test("notificação repetida mais tarde não manda outro e-mail", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order);
    await sendWebhook({ dataId: "1001" });
    await sendWebhook({ dataId: "1001" });
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  test("falha ao enviar o e-mail: o pedido continua pago e a próxima notificação tenta de novo", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { order } = await novoPedido();
    registrarPagamento(order);
    sendOrderConfirmationEmail.mockRejectedValueOnce(new Error("smtp caiu"));

    const primeira = await sendWebhook({ dataId: "1001" });
    expect(primeira.status).toBe(200);
    expect(pedidoNoBanco().status).toBe("pago");
    expect(pedidoNoBanco().confirmationEmailSentAt).toBeNull(); // trava liberada

    await sendWebhook({ dataId: "1001" });
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(2);
    expect(pedidoNoBanco().confirmationEmailSentAt).toBeInstanceOf(Date);
  });
});

describe("webhook: outros status do pagamento", () => {
  test.each(["pending", "in_process"])("'%s': o pedido segue pendente e nenhum e-mail sai", async (status) => {
    const { order } = await novoPedido();
    registrarPagamento(order, { status });
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(200);
    expect(pedidoNoBanco().status).toBe("pendente");
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  test("pagamento recusado em pedido pendente: cancelado, sem e-mail", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order, { status: "rejected" });
    await sendWebhook({ dataId: "1001" });
    expect(pedidoNoBanco()).toMatchObject({ status: "cancelado", paymentId: "1001" });
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  test.each(["rejected", "pending", "in_process", "cancelled"])(
    "notificação atrasada '%s' NÃO desfaz um pedido que já foi pago",
    async (status) => {
      const { order } = await novoPedido();
      registrarPagamento(order, { id: "1001", status: "approved" });
      await sendWebhook({ dataId: "1001" });

      registrarPagamento(order, { id: "2002", status }); // tentativa antiga (ex: primeiro cartão recusado)
      await sendWebhook({ dataId: "2002" });

      expect(pedidoNoBanco().status).toBe("pago");
      expect(pedidoNoBanco().paymentId).toBe("1001");
    }
  );

  test.each(["refunded", "charged_back"])("'%s' em pedido pago: o pedido é cancelado", async (status) => {
    const { order } = await novoPedido();
    registrarPagamento(order, { id: "1001", status: "approved" });
    await sendWebhook({ dataId: "1001" });

    registrarPagamento(order, { id: "1001", status });
    await sendWebhook({ dataId: "1001" });
    expect(pedidoNoBanco().status).toBe("cancelado");
  });

  test.each([
    ["menor que o do pedido", 1],
    ["maior que o do pedido", 500],
  ])("pagamento aprovado com valor %s: pedido cancelado, sem e-mail", async (_nome, valor) => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { order } = await novoPedido(); // total 289
    registrarPagamento(order, { amount: valor });
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(200);
    expect(pedidoNoBanco()).toMatchObject({ status: "cancelado", paymentId: "1001" });
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});

describe("webhook: autenticidade da notificação", () => {
  async function pedidoPronto() {
    const { order } = await novoPedido();
    registrarPagamento(order);
    return order;
  }

  test.each([
    ["assinatura inválida", () => ({ "x-signature": "ts=1,v1=00", "x-request-id": "req-1" })],
    ["sem cabeçalho de assinatura", () => ({})],
    ["assinada com outra chave secreta", () => signWebhook({ dataId: "1001", secret: "chave-do-atacante" })],
    ["assinatura de OUTRO pagamento (id adulterado)", () => signWebhook({ dataId: "9999" })],
  ])("%s: 401 e o pedido não muda", async (_nome, cabecalhos) => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await pedidoPronto();
    const res = await sendWebhook({ dataId: "1001", headers: cabecalhos() });
    expect(res.status).toBe(401);
    expect(pedidoNoBanco().status).toBe("pendente");
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  test("MP_VERIFY_SIGNATURE=false em desenvolvimento: aceita notificação sem assinatura", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await pedidoPronto();
    process.env.MP_VERIFY_SIGNATURE = "false";
    try {
      const res = await sendWebhook({ dataId: "1001", headers: {} });
      expect(res.status).toBe(200);
      expect(pedidoNoBanco().status).toBe("pago");
    } finally {
      delete process.env.MP_VERIFY_SIGNATURE;
    }
  });

  test("MP_VERIFY_SIGNATURE=false é IGNORADO em produção: a assinatura continua obrigatória", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    await pedidoPronto();
    process.env.MP_VERIFY_SIGNATURE = "false";
    process.env.NODE_ENV = "production";
    try {
      const res = await sendWebhook({ dataId: "1001", headers: {} });
      expect(res.status).toBe(401);
      expect(pedidoNoBanco().status).toBe("pendente");
    } finally {
      delete process.env.MP_VERIFY_SIGNATURE;
      process.env.NODE_ENV = "test";
    }
  });
});

describe("webhook: notificações que devem ser ignoradas (200, sem retry inútil)", () => {
  beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => {}));

  test("tipo diferente de 'payment' (ex: merchant_order)", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order);
    const res = await sendWebhook({ dataId: "1001", type: "merchant_order" });
    expect(res.status).toBe(200);
    expect(pedidoNoBanco().status).toBe("pendente");
  });

  test("notificação sem o id do pagamento", async () => {
    const res = await request(app).post("/api/payments/webhook").send({ type: "payment" });
    expect(res.status).toBe(200);
  });

  test("pagamento que o Mercado Pago não conhece (ex: notificação de teste com id inventado)", async () => {
    expect((await sendWebhook({ dataId: "123456" })).status).toBe(200);
  });

  test.each([
    ["sem referência de pedido", undefined],
    ["com referência que não é um id válido", "nao-e-um-id"],
    ["com referência a um pedido que não existe", "6acc4b26bb7f99b205994209"],
  ])("pagamento %s", async (_nome, referencia) => {
    const { order } = await novoPedido();
    mp.__setPayment("1001", { external_reference: referencia, status: "approved", transaction_amount: order.total });
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(200);
    expect(pedidoNoBanco().status).toBe("pendente");
    expect(sendOrderConfirmationEmail).not.toHaveBeenCalled();
  });
});

describe("webhook: falhas passageiras (500, pro Mercado Pago tentar de novo)", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));

  test("banco fora do ar: 500, e a nova tentativa funciona quando ele volta", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order);

    fakeDb.setDown(true);
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(500);

    fakeDb.setDown(false); // o Mercado Pago tenta de novo...
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(200);
    expect(pedidoNoBanco().status).toBe("pago");
    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  test("Mercado Pago fora do ar na hora de consultar o pagamento: 500", async () => {
    const { order } = await novoPedido();
    registrarPagamento(order);
    mp.__state.paymentError = Object.assign(new Error("indisponível"), { status: 503 });
    expect((await sendWebhook({ dataId: "1001" })).status).toBe(500);
    expect(pedidoNoBanco().status).toBe("pendente");
  });
});