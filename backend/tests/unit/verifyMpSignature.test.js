// Verificação da assinatura (x-signature) das notificações do Mercado Pago.
const crypto = require("crypto");
const verifyMpSignature = require("../../utils/verifyMpSignature");

const secret = "segredo_de_teste_123";
const ts = "1742505638683";
const assinar = (manifesto, chave = secret) => crypto.createHmac("sha256", chave).update(manifesto).digest("hex");

describe("verifyMpSignature", () => {
  test("aceita a assinatura completa (id, request-id e ts), com o id em maiúsculas na URL", () => {
    const xSignature = `ts=${ts},v1=${assinar(`id:abc123;request-id:req-1;ts:${ts};`)}`;
    expect(verifyMpSignature({ xSignature, xRequestId: "req-1", dataIdFromUrl: "ABC123", secret })).toEqual({ valid: true });
  });

  test("sem x-request-id, o item sai do texto assinado (como manda a documentação)", () => {
    const xSignature = `ts=${ts},v1=${assinar(`id:abc123;ts:${ts};`)}`;
    expect(verifyMpSignature({ xSignature, dataIdFromUrl: "abc123", secret }).valid).toBe(true);
  });

  test("sem data.id na URL, o item sai do texto assinado", () => {
    const xSignature = `ts=${ts},v1=${assinar(`request-id:req-1;ts:${ts};`)}`;
    expect(verifyMpSignature({ xSignature, xRequestId: "req-1", secret }).valid).toBe(true);
  });

  test("recusa chave secreta errada", () => {
    const xSignature = `ts=${ts},v1=${assinar(`id:abc123;request-id:req-1;ts:${ts};`, "outra_chave")}`;
    const r = verifyMpSignature({ xSignature, xRequestId: "req-1", dataIdFromUrl: "abc123", secret });
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/hash diferente/);
  });

  test("recusa id adulterado", () => {
    const xSignature = `ts=${ts},v1=${assinar(`id:abc123;request-id:req-1;ts:${ts};`)}`;
    expect(verifyMpSignature({ xSignature, xRequestId: "req-1", dataIdFromUrl: "999999", secret }).valid).toBe(false);
  });

  test("a chave com espaços sobrando no começo ou no fim continua funcionando", () => {
    const xSignature = `ts=${ts},v1=${assinar(`id:abc123;request-id:req-1;ts:${ts};`)}`;
    expect(verifyMpSignature({ xSignature, xRequestId: "req-1", dataIdFromUrl: "abc123", secret: `  ${secret}\n` }).valid).toBe(true);
  });

  test.each([
    ["sem header x-signature", { xSignature: undefined, secret }, /sem header/],
    ["header malformado", { xSignature: "lixo", secret }, /malformado/],
    ["sem chave secreta configurada", { xSignature: "ts=1,v1=aa", secret: "" }, /MP_WEBHOOK_SECRET vazio/],
  ])("recusa %s dizendo o motivo", (_nome, entrada, motivo) => {
    const r = verifyMpSignature(entrada);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(motivo);
  });
});