// Conteúdo do e-mail de confirmação do pedido (não envia nada, só monta o texto).
const { buildOrderEmail } = require("../../utils/sendOrderEmail");

const pedido = {
  _id: { toString: () => "6acc4b26bb7f99b205994209" },
  createdAt: "2026-10-12T02:51:18.239Z",
  total: 438.5,
  items: [
    { name: "Teclado Mecânico Nimbus", price: 289, qty: 1 },
    { name: "Mouse Vertex 2", price: 149.5, qty: 1 },
  ],
  address: { street: "Rua das Flores", number: "123", neighborhood: "Centro", city: "Parintins", state: "AM", zip: "69151-000" },
};

describe("buildOrderEmail", () => {
  test("assunto com o número do pedido (6 últimos caracteres do id)", () => {
    expect(buildOrderEmail(pedido, { name: "Gabriel Mendes" }).subject).toBe("Pagamento confirmado — pedido #994209");
  });

  test("mostra itens, total em reais, saudação com o primeiro nome e o endereço", () => {
    const { html, text } = buildOrderEmail(pedido, { name: "Gabriel Mendes" });
    expect(html).toContain("Olá, Gabriel.");
    expect(html).toContain("Teclado Mecânico Nimbus");
    expect(html).toContain("Endereço de entrega");
    expect(html).toContain("Rua das Flores, 123");
    expect(text).toContain("Total: R$");
    expect(text).toContain("CEP 69151-000");
    expect(html).toMatch(/438,50/);
  });

  test("a data do pedido aparece no horário de Manaus (02:51 UTC = 22:51 do dia anterior)", () => {
    expect(buildOrderEmail(pedido, { name: "Ana" }).html).toMatch(/11\/10\/2026.*22:51/);
  });

  test("escapa HTML vindo de nome, produto e endereço (nada é executado no e-mail)", () => {
    const hostil = {
      ...pedido,
      items: [{ name: 'Mouse <script>alert(1)</script> "Vertex"', price: 10, qty: 1 }],
      address: { street: "<img src=x onerror=alert(1)>", city: "Parintins" },
    };
    const { html } = buildOrderEmail(hostil, { name: "Gabriel <b>Almeida</b>" });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>Almeida");
    expect(html).toContain("&lt;script&gt;");
  });

  test("pedido sem endereço: o bloco de entrega some e o e-mail continua válido", () => {
    const { html, text } = buildOrderEmail({ ...pedido, address: undefined }, { name: "Ana" });
    expect(html).not.toContain("Endereço de entrega");
    expect(text).not.toContain("Endereço de entrega");
  });

  test("usuário sem nome: cumprimenta como 'cliente'", () => {
    expect(buildOrderEmail(pedido, { name: "" }).html).toContain("Olá, cliente.");
  });
});