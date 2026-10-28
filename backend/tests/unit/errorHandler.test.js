// Tradução de erros conhecidos (banco, JSON, id inválido...) em respostas HTTP.
const mongoose = require("mongoose");
const User = require("../../models/User");
const { translateError, sendError } = require("../../middleware/errorHandler");

const respostaFalsa = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
};

describe("translateError", () => {
  test("JSON inválido no corpo", () => {
    expect(translateError({ type: "entity.parse.failed" })).toEqual({ status: 400, message: "O corpo da requisição não é um JSON válido." });
  });

  test("corpo grande demais", () => {
    expect(translateError({ type: "entity.too.large" })).toEqual({ status: 413, message: "A requisição é grande demais." });
  });

  test("id inválido (CastError em _id)", () => {
    const erro = new mongoose.Error.CastError("ObjectId", "abc", "_id");
    expect(translateError(erro)).toEqual({ status: 400, message: "Identificador inválido." });
  });

  test("CastError em outro campo", () => {
    const erro = new mongoose.Error.CastError("Number", "x", "idade");
    expect(translateError(erro)).toEqual({ status: 400, message: "Dados inválidos." });
  });

  test("e-mail inválido (ValidationError real do modelo User)", () => {
    const erro = new User({ name: "Ana", email: "nao-e-email", password: "x" }).validateSync();
    expect(translateError(erro)).toEqual({ status: 400, message: "E-mail inválido." });
  });

  test("outro campo inválido lista os campos em português", () => {
    const erro = new User({ email: "a@a.com" }).validateSync(); // faltam nome e senha
    const { status, message } = translateError(erro);
    expect(status).toBe(400);
    // a ordem em que o Mongoose lista os campos não importa
    expect(message).toMatch(/^Dados inválidos \((nome, senha|senha, nome)\)\.$/);
  });

  test("e-mail repetido (índice único do Mongo, código 11000)", () => {
    expect(translateError({ code: 11000, keyPattern: { email: 1 } })).toEqual({ status: 409, message: "Já existe uma conta com esse e-mail." });
  });

  test("outro valor repetido", () => {
    expect(translateError({ code: 11000, keyPattern: { cpf: 1 } })).toEqual({ status: 409, message: "Já existe um registro com esses dados." });
  });

  test("erro 4xx do próprio Express", () => {
    expect(translateError({ expose: true, status: 415 })).toEqual({ status: 415, message: "Requisição inválida." });
  });

  test.each([
    ["erro comum", new Error("boom")],
    ["erro 5xx", { expose: false, status: 503 }],
    ["erro do Mercado Pago (status 403 sem 'expose')", { status: 403, message: "UNAUTHORIZED" }],
    ["nada", null],
  ])("não reconhece %s (vira 500)", (_nome, erro) => {
    expect(translateError(erro)).toBeNull();
  });
});

describe("sendError", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));

  test("erro conhecido: responde com o status certo e não registra erro no log", () => {
    const res = respostaFalsa();
    sendError(res, { code: 11000, keyPattern: { email: 1 } }, "Erro ao criar a conta.");
    expect(res.statusCode).toBe(409);
    expect(console.error).not.toHaveBeenCalled();
  });

  test("erro inesperado: 500 genérico (sem vazar o motivo) e o erro vai pro log", () => {
    const res = respostaFalsa();
    sendError(res, new Error("senha do banco: 123"), "Erro ao criar a conta.");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao criar a conta." });
    expect(console.error).toHaveBeenCalled();
  });

  test("exposeDetails mostra o motivo fora de produção", () => {
    const res = respostaFalsa();
    sendError(res, new Error("credencial recusada"), "Falhou.", { exposeDetails: true });
    expect(res.body).toEqual({ error: "Falhou.", details: "credencial recusada" });
  });

  test("exposeDetails NÃO mostra o motivo em produção", () => {
    process.env.NODE_ENV = "production";
    try {
      const res = respostaFalsa();
      sendError(res, new Error("credencial recusada"), "Falhou.", { exposeDetails: true });
      expect(res.body).toEqual({ error: "Falhou." });
    } finally {
      process.env.NODE_ENV = "test";
    }
  });
});