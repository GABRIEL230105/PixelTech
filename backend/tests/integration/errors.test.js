// Respostas de erro gerais da API: sempre em JSON, nunca uma página HTML do Express.
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const mongoose = require("mongoose");
const { app, request, fakeDb } = require("../helpers/api");

beforeEach(() => fakeDb.reset());

describe("rotas e corpo da requisição", () => {
  test("rota que não existe: 404 em JSON", async () => {
    const res = await request(app).get("/api/nao-existe");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body).toEqual({ error: "Rota não encontrada." });
  });

  test("JSON quebrado no corpo: 400 em JSON (não uma página HTML)", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.error).toBe("O corpo da requisição não é um JSON válido.");
  });

  test("corpo grande demais (acima de 100 KB): 413 em JSON", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a".repeat(200 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("A requisição é grande demais.");
  });
});

describe("GET /api/health", () => {
  afterEach(() => {
    delete mongoose.connection.readyState; // volta ao valor original
  });

  test("sem conexão com o banco: 503", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "sem conexão com o banco", database: "desconectado" });
  });

  test("com o banco conectado: 200", async () => {
    Object.defineProperty(mongoose.connection, "readyState", { value: 1, configurable: true });
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", database: "conectado" });
  });
});