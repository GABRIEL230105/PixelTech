// Catálogo oficial de produtos. É AQUI que os preços valem de verdade: o backend
// ignora qualquer preço ou total que venha do navegador e usa só estes valores.
//
// Os ids e preços precisam ser os mesmos de frontend/src/data/products.js
// (o front usa aquele arquivo só pra desenhar a vitrine). Se um preço mudar,
// mude nos dois lugares.
const PRODUCTS = [
  { id: 1, name: "Fone Aurora Pro", price: 349.9 },
  { id: 2, name: "Teclado Mecânico Nimbus", price: 289.0 },
  { id: 3, name: "Mouse Vertex 2", price: 149.5 },
  { id: 4, name: "Carregador GaN 65W", price: 129.9 },
  { id: 5, name: "Hub USB-C Slate", price: 99.0 },
  { id: 6, name: "Suporte Notebook Halo", price: 79.9 },
];

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

function getProduct(id) {
  return byId.get(id);
}

module.exports = { PRODUCTS, getProduct };