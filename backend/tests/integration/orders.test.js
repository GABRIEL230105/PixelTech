// Pedidos: o servidor calcula nomes, preços e total; o endereço vem da conta; cada pedido é do seu dono.
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const { app, request, fakeDb, registerUser, createOrder, auth } = require("../helpers/api");

beforeEach(() => fakeDb.reset());

describe("POST /api/orders", () => {
  test("cria o pedido pendente com nome e preço do catálogo do servidor", async () => {
    const { token, id } = await registerUser();
    const res = await createOrder(token, [{ productId: 2, qty: 1 }, { productId: 3, qty: 2 }]);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pendente");
    expect(res.body.user).toBe(id);
    expect(res.body.total).toBe(588); // 289 + 2 x 149,50
    expect(res.body.items).toEqual([
      { productId: 2, name: "Teclado Mecânico Nimbus", price: 289, qty: 1 },
      { productId: 3, name: "Mouse Vertex 2", price: 149.5, qty: 2 },
    ]);
    expect(fakeDb.store.Order).toHaveLength(1);
  });

  test("ignora preço, nome e total enviados pelo navegador (tentativa de fraude)", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/orders")
      .set(auth(token))
      .send({ items: [{ productId: 2, qty: 1, price: 1, name: "Teclado de graça" }], total: 1 });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(289);
    expect(res.body.items[0]).toMatchObject({ name: "Teclado Mecânico Nimbus", price: 289 });
  });

  test("soma linhas repetidas do mesmo produto", async () => {
    const { token } = await registerUser();
    const res = await createOrder(token, [{ productId: 5, qty: 2 }, { productId: 5, qty: 3 }]);
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].qty).toBe(5);
    expect(res.body.total).toBe(495);
  });

  test("calcula o total sem erro de arredondamento (3 x 129,90 = 389,70)", async () => {
    const { token } = await registerUser();
    const res = await createOrder(token, [{ productId: 4, qty: 3 }]);
    expect(res.body.total).toBe(389.7);
  });

  test.each([
    ["sem itens", undefined, "O pedido precisa ter pelo menos um item."],
    ["lista vazia", [], "O pedido precisa ter pelo menos um item."],
    ["itens que não são uma lista", { productId: 1, qty: 1 }, "O pedido precisa ter pelo menos um item."],
    ["produto que não existe", [{ productId: 999, qty: 1 }], "Produto inexistente: 999."],
    ["productId como texto", [{ productId: "2", qty: 1 }], "Produto inexistente: 2."],
    ["quantidade zero", [{ productId: 1, qty: 0 }], /Quantidade inválida/],
    ["quantidade negativa", [{ productId: 1, qty: -3 }], /Quantidade inválida/],
    ["quantidade decimal", [{ productId: 1, qty: 1.5 }], /Quantidade inválida/],
    ["quantidade como texto", [{ productId: 1, qty: "2" }], /Quantidade inválida/],
    ["quantidade acima do limite (100)", [{ productId: 1, qty: 100 }], /Quantidade inválida/],
    ["linhas repetidas que passam do limite juntas", [{ productId: 1, qty: 60 }, { productId: 1, qty: 60 }], /acima do limite/],
  ])("recusa pedido com %s", async (_nome, items, mensagem) => {
    const { token } = await registerUser();
    const res = await request(app).post("/api/orders").set(auth(token)).send({ items });
    expect(res.status).toBe(400);
    typeof mensagem === "string" ? expect(res.body.error).toBe(mensagem) : expect(res.body.error).toMatch(mensagem);
    expect(fakeDb.store.Order).toHaveLength(0);
  });

  test("exige login", async () => {
    const res = await request(app).post("/api/orders").send({ items: [{ productId: 1, qty: 1 }] });
    expect(res.status).toBe(401);
    expect(fakeDb.store.Order).toHaveLength(0);
  });
});

describe("endereço de entrega", () => {
  test("usa o endereço salvo na conta, sem o navegador mandar nada", async () => {
    const { token } = await registerUser({ address: { street: " Rua das Flores ", number: "123", city: "Parintins", state: "AM", zip: "69151-000", neighborhood: "" } });
    const res = await createOrder(token);
    expect(res.body.address).toEqual({ street: "Rua das Flores", number: "123", city: "Parintins", state: "AM", zip: "69151-000" });
  });

  test("ignora endereço enviado no pedido", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post("/api/orders")
      .set(auth(token))
      .send({ items: [{ productId: 2, qty: 1 }], address: { street: "Rua Falsa", city: "Outra Cidade" } });
    expect(res.body.address.street).toBe("Rua das Flores");
    expect(res.body.address.city).toBe("Parintins");
  });

  test.each([
    ["conta cadastrada com o endereço em branco", { address: { street: "", number: "", neighborhood: "", city: "", state: "", zip: "" } }],
    ["conta sem endereço nenhum", { address: undefined }],
  ])("%s: o pedido sai, sem objeto de endereço", async (_nome, campos) => {
    const { token } = await registerUser(campos);
    const res = await createOrder(token);
    expect(res.status).toBe(201);
    expect(res.body.address).toBeUndefined();
  });
});

describe("consulta de pedidos", () => {
  test("GET /api/orders/my lista só os pedidos de quem está logado", async () => {
    const ana = await registerUser();
    const beto = await registerUser({ name: "Beto" });
    await createOrder(ana.token, [{ productId: 1, qty: 1 }]);
    await createOrder(ana.token, [{ productId: 2, qty: 1 }]);
    await createOrder(beto.token, [{ productId: 3, qty: 1 }]);

    const daAna = await request(app).get("/api/orders/my").set(auth(ana.token));
    const doBeto = await request(app).get("/api/orders/my").set(auth(beto.token));
    expect(daAna.body).toHaveLength(2);
    expect(doBeto.body).toHaveLength(1);
    expect(doBeto.body[0].items[0].name).toBe("Mouse Vertex 2");
  });

  test("GET /api/orders/:id: o dono vê o pedido", async () => {
    const { token } = await registerUser();
    const { body: pedido } = await createOrder(token);
    const res = await request(app).get(`/api/orders/${pedido._id}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(pedido._id);
  });

  test("GET /api/orders/:id: outro usuário recebe 404 (não vê pedido nem endereço alheio)", async () => {
    const ana = await registerUser();
    const beto = await registerUser({ name: "Beto" });
    const { body: pedido } = await createOrder(ana.token);
    const res = await request(app).get(`/api/orders/${pedido._id}`).set(auth(beto.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Pedido não encontrado.");
    expect(JSON.stringify(res.body)).not.toContain("Parintins");
  });

  test("GET /api/orders/:id: id com formato inválido dá 400, não 500", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/orders/abc").set(auth(token));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Identificador inválido.");
  });

  test("GET /api/orders/:id: id válido que não existe dá 404", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/orders/6acc4b26bb7f99b205994209").set(auth(token));
    expect(res.status).toBe(404);
  });

  test("banco fora do ar: 500 com mensagem genérica", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { token } = await registerUser();
    fakeDb.setDown(true);
    // o token também precisa do banco, então o erro vem do próprio login por token
    const res = await request(app).get("/api/orders/my").set(auth(token));
    expect(res.status).toBe(500);
  });
});