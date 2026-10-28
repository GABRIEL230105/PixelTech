// Cálculo de itens e total no servidor + conferência do catálogo com a vitrine do front.
const fs = require("fs");
const path = require("path");
const buildOrderItems = require("../../utils/buildOrderItems");
const { PRODUCTS, getProduct } = require("../../data/catalog");

describe("buildOrderItems", () => {
  test("usa nome e preço do catálogo e soma o total", () => {
    const r = buildOrderItems([{ productId: 2, qty: 1 }, { productId: 3, qty: 2 }]);
    expect(r.total).toBe(588);
    expect(r.items[0]).toEqual({ productId: 2, name: "Teclado Mecânico Nimbus", price: 289, qty: 1 });
  });

  test("só lê productId e qty: preço, nome e total do cliente não entram", () => {
    const r = buildOrderItems([{ productId: 2, qty: 1, price: 1, name: "grátis", total: 1 }]);
    expect(r.total).toBe(289);
    expect(r.items[0].price).toBe(289);
  });

  test("conta em centavos: 3 x 129,90 = 389,70 exato (a conta ingênua dá 389.70000000000005)", () => {
    expect(129.9 * 3).not.toBe(389.7);
    expect(buildOrderItems([{ productId: 4, qty: 3 }]).total).toBe(389.7);
  });

  test("junta linhas repetidas do mesmo produto", () => {
    const r = buildOrderItems([{ productId: 5, qty: 2 }, { productId: 5, qty: 3 }]);
    expect(r.items).toEqual([{ productId: 5, name: "Hub USB-C Slate", price: 99, qty: 5 }]);
    expect(r.total).toBe(495);
  });

  test("aceita o limite de 99 unidades", () => {
    expect(buildOrderItems([{ productId: 1, qty: 99 }]).items[0].qty).toBe(99);
  });

  test.each([
    ["ausente", undefined],
    ["não é lista", { productId: 1, qty: 1 }],
    ["lista vazia", []],
    ["produto inexistente", [{ productId: 999, qty: 1 }]],
    ["productId como texto", [{ productId: "2", qty: 1 }]],
    ["productId nulo", [{ productId: null, qty: 1 }]],
    ["productId '__proto__'", [{ productId: "__proto__", qty: 1 }]],
    ["item nulo", [null]],
    ["quantidade 0", [{ productId: 1, qty: 0 }]],
    ["quantidade negativa", [{ productId: 1, qty: -3 }]],
    ["quantidade decimal", [{ productId: 1, qty: 1.5 }]],
    ["quantidade como texto", [{ productId: 1, qty: "2" }]],
    ["quantidade NaN", [{ productId: 1, qty: NaN }]],
    ["quantidade 100", [{ productId: 1, qty: 100 }]],
    ["soma das repetidas passa de 99", [{ productId: 1, qty: 60 }, { productId: 1, qty: 60 }]],
  ])("recusa: %s", (_nome, entrada) => {
    const r = buildOrderItems(entrada);
    expect(r.error).toEqual(expect.any(String));
    expect(r.items).toBeUndefined();
  });
});

describe("catálogo do servidor x vitrine do front", () => {
  // Os preços existem em dois lugares (backend/data/catalog.js e frontend/src/data/products.js).
  // Este teste avisa se eles se desencontrarem. Se o front não estiver na pasta ao lado
  // (../frontend), o teste é pulado em vez de falhar.
  const frontFile = path.join(__dirname, "../../../frontend/src/data/products.js");
  const rodaSeExistir = fs.existsSync(frontFile) ? test : test.skip;

  rodaSeExistir("ids, nomes e preços são os mesmos nos dois lugares", () => {
    const source = fs.readFileSync(frontFile, "utf8");
    const front = [...source.matchAll(/id:\s*(\d+),\s*name:\s*"([^"]+)".*?price:\s*([\d.]+)/g)].map((m) => ({
      id: Number(m[1]),
      name: m[2],
      price: Number(m[3]),
    }));

    expect(front).toHaveLength(PRODUCTS.length);
    front.forEach((produto) => expect(getProduct(produto.id)).toEqual(produto));
  });
});