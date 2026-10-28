// Cadastro, login e proteção das rotas por token (JWT).
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { app, request, fakeDb, registerUser, auth } = require("../helpers/api");

beforeEach(() => fakeDb.reset());

describe("POST /api/auth/register", () => {
  test("cria a conta, devolve o token e guarda a senha com hash", async () => {
    const { res, body } = await registerUser({ email: "ana@teste.com" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body).toMatchObject({ name: "Ana Souza", email: "ana@teste.com" });
    expect(res.body.password).toBeUndefined();

    const saved = fakeDb.store.User[0];
    expect(saved.password).not.toBe(body.password);
    expect(saved.password).toMatch(/^\$2[aby]\$/); // formato do bcrypt
    expect(saved.emailVerified).toBe(false);
  });

  test("o token devolvido já funciona nas rotas protegidas", async () => {
    const { token } = await registerUser();
    const res = await request(app).get("/api/orders/my").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("recusa e-mail que já existe, mesmo com maiúsculas e espaços", async () => {
    await registerUser({ email: "ana@teste.com" });
    const { res } = await registerUser({ email: "  ANA@teste.com " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Já existe uma conta com esse e-mail.");
    expect(fakeDb.store.User).toHaveLength(1);
  });

  test("corrida entre dois cadastros: o índice único do banco responde 409", async () => {
    await registerUser({ email: "ana@teste.com" });
    // a checagem "já existe?" não vê a outra conta (as duas requisições passaram juntas)...
    jest.spyOn(User, "findOne").mockReturnValueOnce(Promise.resolve(null));
    // ...mas o banco barra a segunda
    const { res } = await registerUser({ email: "ana@teste.com" });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Já existe uma conta com esse e-mail.");
    expect(fakeDb.store.User).toHaveLength(1);
  });

  test("recusa e-mail com formato inválido (400, não 500)", async () => {
    const { res } = await registerUser({ email: "isso-nao-e-email" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("E-mail inválido.");
  });

  test.each([
    ["sem nome", { name: "" }],
    ["sem e-mail", { email: "" }],
    ["sem senha", { password: "" }],
    ["só espaços no nome", { name: "   " }],
  ])("recusa cadastro %s", async (_nome, campos) => {
    const { res } = await registerUser(campos);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Preencha nome, e-mail e senha.");
  });

  test.each([
    ["e-mail em forma de objeto ({$gt})", { email: { $gt: "" } }],
    ["nome como número", { name: 123 }],
    ["senha como lista", { password: ["123456"] }],
  ])("recusa entrada que não é texto: %s", async (_nome, campos) => {
    const { res } = await registerUser(campos);
    expect(res.status).toBe(400);
    expect(fakeDb.store.User).toHaveLength(0);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await registerUser({ email: "ana@teste.com", password: "senha-certa" });
  });

  test("entra com e-mail e senha corretos", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "ana@teste.com", password: "senha-certa" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Ana Souza", email: "ana@teste.com" });
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.password).toBeUndefined();
    expect(res.body.address).toMatchObject({ city: "Parintins" });
  });

  test("aceita o e-mail com maiúsculas e espaços", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "  Ana@Teste.COM ", password: "senha-certa" });
    expect(res.status).toBe(200);
  });

  test("senha errada e e-mail inexistente dão a MESMA resposta (não revela quais e-mails existem)", async () => {
    const errada = await request(app).post("/api/auth/login").send({ email: "ana@teste.com", password: "outra" });
    const inexistente = await request(app).post("/api/auth/login").send({ email: "ninguem@teste.com", password: "senha-certa" });
    expect(errada.status).toBe(400);
    expect(inexistente.status).toBe(400);
    expect(errada.body).toEqual(inexistente.body);
    expect(errada.body.error).toBe("E-mail ou senha inválidos.");
  });

  test.each([
    ["sem e-mail", { password: "senha-certa" }],
    ["sem senha", { email: "ana@teste.com" }],
    ["e-mail em forma de objeto ({$ne: null})", { email: { $ne: null }, password: "senha-certa" }],
    ["senha em forma de objeto", { email: "ana@teste.com", password: { $ne: "" } }],
  ])("recusa login %s", async (_nome, corpo) => {
    const res = await request(app).post("/api/auth/login").send(corpo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Informe e-mail e senha.");
  });

  test("banco fora do ar: 500 com mensagem genérica (sem vazar o erro interno)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fakeDb.setDown(true);
    const res = await request(app).post("/api/auth/login").send({ email: "ana@teste.com", password: "senha-certa" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao fazer login." });
  });
});

describe("proteção das rotas por token", () => {
  const protegida = () => request(app).get("/api/orders/my");

  test("sem token: 401", async () => {
    const res = await protegida();
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Não autorizado, token não enviado.");
  });

  test("token que não é um JWT: 401 'Token inválido'", async () => {
    const res = await protegida().set(auth("lixo"));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token inválido/);
  });

  test("token assinado com outro segredo: 401", async () => {
    const falso = jwt.sign({ id: "6acc4b26bb7f99b205994209" }, "segredo-do-atacante");
    const res = await protegida().set(auth(falso));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token inválido/);
  });

  test("token expirado: 401 'Sessão expirada'", async () => {
    const { id } = await registerUser();
    const expirado = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await protegida().set(auth(expirado));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Sessão expirada/);
  });

  test("token válido de uma conta que não existe mais: 401 (não 500)", async () => {
    const { id, token } = await registerUser();
    fakeDb.store.User = fakeDb.store.User.filter((u) => String(u._id) !== String(id));
    const res = await protegida().set(auth(token));
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Conta não encontrada/);
  });

  test("banco fora do ar ao validar o token: 500, não 401 (não é culpa do token)", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const { token } = await registerUser();
    fakeDb.setDown(true);
    const res = await protegida().set(auth(token));
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/validar o login/);
  });
});