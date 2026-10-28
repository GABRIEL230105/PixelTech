// Conferência do .env na hora de subir o servidor.
const { inspectEnv, checkEnv } = require("../../utils/checkEnv");

const bom = {
  JWT_SECRET: "uma-frase-longa-e-aleatoria-com-mais-de-32-caracteres",
  EMAIL_USER: "loja@gmail.com",
  EMAIL_PASS: "abcdefghijklmnop",
  MP_ACCESS_TOKEN: "APP_USR-8535531719508634-100314-3fef23cef999988b974c3b99f925e8ec-3732708659",
  MP_WEBHOOK_SECRET: "d57314138343828498ceb9b47f8fa4c9a18c6eb326cdef4f2ca931b4c660b548",
  BACKEND_URL: "https://meu-tunel.ngrok-free.dev",
};

describe("inspectEnv", () => {
  test("configuração correta: nada a avisar", () => {
    expect(inspectEnv(bom)).toEqual({ problems: [], warnings: [] });
  });

  test("tudo vazio: um problema para cada variável obrigatória", () => {
    const { problems } = inspectEnv({});
    expect(problems).toHaveLength(6); // JWT, e-mail (2), Access Token, assinatura do webhook, URL
  });

  test.each([
    ["JWT_SECRET", "troque_isso_por_um_segredo_bem_grande_e_aleatorio"],
    ["EMAIL_USER", "seuemail@gmail.com"],
    ["EMAIL_PASS", "sua_senha_de_app_do_gmail"],
    ["MP_ACCESS_TOKEN", "cole_aqui_o_access_token_de_teste_do_mercado_pago"],
    ["MP_WEBHOOK_SECRET", "cole_aqui_a_chave_secreta_do_webhook"],
  ])("%s com o valor de exemplo vira problema", (nome, exemplo) => {
    const { problems } = inspectEnv({ ...bom, [nome]: exemplo });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(new RegExp(`${nome} ainda está com o valor de exemplo`));
  });

  test("detecta o Access Token e a assinatura do webhook TROCADOS de lugar", () => {
    const { warnings } = inspectEnv({ ...bom, MP_ACCESS_TOKEN: bom.MP_WEBHOOK_SECRET, MP_WEBHOOK_SECRET: bom.MP_ACCESS_TOKEN });
    expect(warnings.some((w) => /MP_ACCESS_TOKEN parece a assinatura secreta/.test(w))).toBe(true);
    expect(warnings.some((w) => /MP_WEBHOOK_SECRET parece um Access Token/.test(w))).toBe(true);
  });

  test("Access Token que não parece um token avisa", () => {
    const { warnings } = inspectEnv({ ...bom, MP_ACCESS_TOKEN: "qualquer-coisa" });
    expect(warnings.some((w) => /não parece um Access Token/.test(w))).toBe(true);
  });

  test.each([
    ["localhost", "http://localhost:5000", /localhost/],
    ["127.0.0.1", "http://127.0.0.1:5000", /localhost/],
    ["barra no final", "https://x.ngrok-free.dev/", /barra/],
    ["sem http(s)", "x.ngrok-free.dev", /http:\/\/ ou https:\/\//],
  ])("BACKEND_URL com %s avisa", (_nome, url, aviso) => {
    const { warnings } = inspectEnv({ ...bom, BACKEND_URL: url });
    expect(warnings.some((w) => aviso.test(w))).toBe(true);
  });

  test("JWT_SECRET curto avisa, mas não é um problema", () => {
    const r = inspectEnv({ ...bom, JWT_SECRET: "curto" });
    expect(r.problems).toEqual([]);
    expect(r.warnings.some((w) => /curto/.test(w))).toBe(true);
  });

  describe("verificação de assinatura desligada", () => {
    const { MP_WEBHOOK_SECRET, ...semChave } = bom;

    test("em desenvolvimento: só avisa e não exige MP_WEBHOOK_SECRET", () => {
      const r = inspectEnv({ ...semChave, MP_VERIFY_SIGNATURE: "false" });
      expect(r.problems).toEqual([]);
      expect(r.warnings.some((w) => /DESLIGADA/.test(w))).toBe(true);
    });

    test("em produção o 'false' é ignorado e a chave volta a ser obrigatória", () => {
      const r = inspectEnv({ ...semChave, MP_VERIFY_SIGNATURE: "false", NODE_ENV: "production" });
      expect(r.problems.some((p) => /MP_WEBHOOK_SECRET está vazio/.test(p))).toBe(true);
    });
  });
});

describe("checkEnv", () => {
  beforeEach(() => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("em produção, com problema: encerra o servidor com código 1", () => {
    const exit = jest.spyOn(process, "exit").mockImplementation(() => {});
    checkEnv({ ...bom, NODE_ENV: "production", EMAIL_PASS: "" });
    expect(exit).toHaveBeenCalledWith(1);
  });

  test("em desenvolvimento, com problema: só avisa e deixa subir", () => {
    const exit = jest.spyOn(process, "exit").mockImplementation(() => {});
    const r = checkEnv({ ...bom, EMAIL_PASS: "" });
    expect(exit).not.toHaveBeenCalled();
    expect(r.problems).toHaveLength(1);
  });

  test("configuração correta: não imprime nada", () => {
    checkEnv(bom);
    expect(console.warn).not.toHaveBeenCalled();
  });
});