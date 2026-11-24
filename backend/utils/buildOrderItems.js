const { getProduct } = require("../data/catalog");
const Product = require("../models/Product");

const MAX_DISTINCT_ITEMS = 50;
const MAX_QTY_PER_ITEM = 99;

async function findAnyProduct(productId) {
  const staticProduct = getProduct(productId);
  if (staticProduct) return staticProduct;

  const dbProduct = await Product.findOne({ id: productId }).lean();
  return dbProduct || null;
}

async function buildOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "O pedido precisa ter pelo menos um item." };
  }

  const quantities = new Map();

  for (const raw of rawItems) {
    const productId = raw && raw.productId;
    const qty = raw && raw.qty;

    if (typeof productId !== "number") {
      return { error: `Produto inválido: ${String(productId).slice(0, 30)}.` };
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return { error: `Quantidade inválida para o produto ${productId} (use um número inteiro de 1 a ${MAX_QTY_PER_ITEM}).` };
    }

    quantities.set(productId, (quantities.get(productId) || 0) + qty);
  }

  if (quantities.size > MAX_DISTINCT_ITEMS) {
    return { error: `O pedido pode ter no máximo ${MAX_DISTINCT_ITEMS} produtos diferentes.` };
  }

  const items = [];
  let totalCents = 0;

  for (const [productId, qty] of quantities) {
    if (qty > MAX_QTY_PER_ITEM) {
      return { error: `Quantidade total acima do limite para o produto ${productId} (máximo ${MAX_QTY_PER_ITEM}).` };
    }

    const product = await findAnyProduct(productId);
    if (!product) {
      return { error: `Produto inexistente: ${productId}.` };
    }

    items.push({ productId, name: product.name, price: product.price, qty });
    totalCents += Math.round(product.price * 100) * qty;
  }

  return { items, total: totalCents / 100 };
}

module.exports = buildOrderItems;