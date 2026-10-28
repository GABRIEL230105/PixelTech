// Código de verificação do e-mail (OTP): geração, envio, hash, expiração,
// limite de tentativas, reenvio e validação.
jest.mock("mercadopago", () => require("../helpers/mercadoPagoMock"));
jest.mock("../../utils/sendEmail", () => jest.fn().mockResolvedValue());
jest.mock("../../utils/sendOrderEmail", () => ({ sendOrderConfirmationEmail: jest.fn().mockResolvedValue() }));

const sendOtpEmail = require("../../utils/sendEmail"); // a versão simulada: guarda o que "enviou"
const { app, request, fakeDb, registerUser } = require("../helpers/api");

const EMAIL = "ana@teste.com";

beforeEach(() => fakeDb.reset());

// Pede um código e devolve o código em texto puro que foi "enviado por e-mail"
async function pedirCodigo(email = EMAIL, rota = "send") {
  const res = await request(app).post(`/api/otp/${rota}`).send({ email });
  const [para, codigo] = sendOtpEmail.mock.calls.at(-1) || [];
  return { res, para, codigo };
}
const verificar = (email, code) => request(app).post("/api/otp/verify").send({ email, code });

describe("envio do código", () => {
  test("gera um código de 6 dígitos e envia para o e-mail pedido", async () => {
    const { res, para, codigo } = await pedirCodigo();
    expect(res.status).toBe(200);
    expect(para).toBe(EMAIL);
    expect(codigo).toMatch(/^\d{6}$/);
  });

  test("no banco fica só o hash do código, com 10 minutos de validade e 0 tentativas", async () => {
    const { codigo } = await pedirCodigo();
    const [otp] = fakeDb.store.Otp;

    expect(fakeDb.store.Otp).toHaveLength(1);
    expect(otp.codeHash).not.toBe(codigo);
    expect(JSON.stringify(otp)).not.toContain(codigo);
    expect(otp.codeHash).toMatch(/^\$2[aby]\$/);
    expect(otp.attempts).toBe(0);

    const minutos = (otp.expiresAt.getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(9.5);
    expect(minutos).toBeLessThanOrEqual(10);
  });

  test("falha ao enviar o e-mail: 500 com mensagem genérica", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    sendOtpEmail.mockRejectedValueOnce(new Error("smtp caiu"));
    const { res } = await pedirCodigo();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Não foi possível enviar o código." });
  });

  test.each([
    ["sem e-mail", {}, "Informe o e-mail."],
    ["e-mail vazio", { email: "  " }, "Informe o e-mail."],
    ["e-mail sem formato de e-mail", { email: "sem-arroba" }, "E-mail inválido."],
    ["e-mail em lista", { email: ["a@a.com"] }, "Informe o e-mail."],
    ["e-mail em forma de objeto", { email: { $ne: null } }, "Informe o e-mail."],
  ])("recusa pedido de código %s (e não gasta e-mail à toa)", async (_nome, corpo, mensagem) => {
    const res = await request(app).post("/api/otp/send").send(corpo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe(mensagem);
    expect(sendOtpEmail).not.toHaveBeenCalled();
    expect(fakeDb.store.Otp).toHaveLength(0);
  });
});

describe("validação do código", () => {
  test("código certo: 200, marca o e-mail da conta como verificado e apaga o código", async () => {
    await registerUser({ email: EMAIL });
    expect(fakeDb.store.User[0].emailVerified).toBe(false);

    const { codigo } = await pedirCodigo();
    const res = await verificar(EMAIL, codigo);

    expect(res.status).toBe(200);
    expect(fakeDb.store.User[0].emailVerified).toBe(true);
    expect(fakeDb.store.Otp).toHaveLength(0);
  });

  test("o mesmo código não vale duas vezes", async () => {
    const { codigo } = await pedirCodigo();
    expect((await verificar(EMAIL, codigo)).status).toBe(200);

    const segunda = await verificar(EMAIL, codigo);
    expect(segunda.status).toBe(400);
    expect(segunda.body.error).toBe("Nenhum código pendente para esse e-mail. Peça um novo.");
  });

  test("código errado: 400 e conta as tentativas que restam", async () => {
    const { codigo } = await pedirCodigo();
    const errado = codigo === "000000" ? "111111" : "000000";

    const primeira = await verificar(EMAIL, errado);
    expect(primeira.status).toBe(400);
    expect(primeira.body.error).toBe("Código incorreto. Tentativas restantes: 4.");

    const segunda = await verificar(EMAIL, errado);
    expect(segunda.body.error).toBe("Código incorreto. Tentativas restantes: 3.");
    expect(fakeDb.store.Otp[0].attempts).toBe(2);
  });

  test("limite de tentativas: depois de 5 erros nem o código certo funciona, e o código é apagado", async () => {
    const { codigo } = await pedirCodigo();
    const errado = codigo === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i += 1) {
      expect((await verificar(EMAIL, errado)).status).toBe(400);
    }

    const bloqueado = await verificar(EMAIL, codigo); // certo, mas já estourou o limite
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.error).toBe("Muitas tentativas erradas. Peça um novo código.");
    expect(fakeDb.store.Otp).toHaveLength(0);

    const depois = await verificar(EMAIL, codigo);
    expect(depois.status).toBe(400);
    expect(depois.body.error).toMatch(/Nenhum código pendente/);
  });

  test("código expirado: 400 e o código é apagado", async () => {
    await registerUser({ email: EMAIL });
    const { codigo } = await pedirCodigo();
    fakeDb.store.Otp[0].expiresAt = new Date(Date.now() - 1000); // venceu há 1 segundo

    const res = await verificar(EMAIL, codigo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Código expirado. Peça um novo.");
    expect(fakeDb.store.Otp).toHaveLength(0);
    expect(fakeDb.store.User[0].emailVerified).toBe(false);
  });

  test("e-mail sem nenhum código pedido: 400", async () => {
    const res = await verificar("ninguem@teste.com", "123456");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nenhum código pendente/);
  });

  test("o código de um e-mail não vale para outro", async () => {
    const { codigo } = await pedirCodigo("a@teste.com");
    const res = await verificar("b@teste.com", codigo);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nenhum código pendente/);
  });

  test.each([
    ["e-mail em forma de objeto", { email: { $ne: null }, code: "123456" }],
    ["código como número", { email: EMAIL, code: 123456 }],
    ["sem código", { email: EMAIL }],
    ["sem e-mail", { code: "123456" }],
  ])("recusa pedido de validação %s", async (_nome, corpo) => {
    const res = await request(app).post("/api/otp/verify").send(corpo);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Informe e-mail e código.");
  });

  test("banco fora do ar: 500, sem vazar o erro interno", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fakeDb.setDown(true);
    const res = await verificar(EMAIL, "123456");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Erro ao verificar o código." });
  });
});

describe("reenvio do código", () => {
  test("o código novo invalida o anterior: sobra só um registro e o antigo deixa de valer", async () => {
    const random = jest.spyOn(Math, "random");
    random.mockReturnValueOnce(0); // 1º código: 100000
    const primeiro = await pedirCodigo();
    random.mockReturnValueOnce(0.5); // 2º código: 550000
    const segundo = await pedirCodigo(EMAIL, "resend");

    expect(primeiro.codigo).toBe("100000");
    expect(segundo.codigo).toBe("550000");
    expect(segundo.res.status).toBe(200);
    expect(fakeDb.store.Otp).toHaveLength(1);

    const antigo = await verificar(EMAIL, primeiro.codigo);
    expect(antigo.status).toBe(400);
    expect(antigo.body.error).toMatch(/Código incorreto/);

    expect((await verificar(EMAIL, segundo.codigo)).status).toBe(200);
  });

  test("o reenvio zera as tentativas já gastas", async () => {
    const { codigo } = await pedirCodigo();
    const errado = codigo === "000000" ? "111111" : "000000";
    await verificar(EMAIL, errado);
    await verificar(EMAIL, errado);
    expect(fakeDb.store.Otp[0].attempts).toBe(2);

    const novo = await pedirCodigo(EMAIL, "resend");
    const novoErrado = novo.codigo === "000000" ? "111111" : "000000";
    expect(fakeDb.store.Otp[0].attempts).toBe(0);
    expect((await verificar(EMAIL, novoErrado)).body.error).toBe("Código incorreto. Tentativas restantes: 4.");
  });

  test("falha ao reenviar o e-mail: 500 com mensagem genérica", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    sendOtpEmail.mockRejectedValueOnce(new Error("smtp caiu"));
    const { res } = await pedirCodigo(EMAIL, "resend");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Não foi possível reenviar o código." });
  });
});