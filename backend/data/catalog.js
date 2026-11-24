// Catálogo oficial de produtos. É AQUI que os preços valem de verdade: o backend
// ignora qualquer preço ou total que venha do navegador e usa só estes valores.
//
// Os ids e preços precisam ser os mesmos de frontend/src/data/products.js
// (o front usa aquele arquivo só pra desenhar a vitrine). Se um preço mudar,
// mude nos dois lugares.
const PRODUCTS = [
  // ---------------- ÁUDIO (20 produtos) ----------------
  { id: 1, name: "Fone Aurora Pro", price: 349.9 },
  { id: 2, name: "Headset Gamer Órion", price: 299.9 },
  { id: 3, name: "Microfone Studio Pod", price: 459.0 },
  { id: 4, name: "Soundbar Echo 2.1", price: 399.0 },
  { id: 5, name: "Earbuds TWS Sense", price: 199.9 },
  { id: 6, name: "Caixa de Som Portátil", price: 259.9 },
  { id: 7, name: "Fone Esportivo Bluetooth", price: 189.9 },
  { id: 8, name: "Monitor de Áudio Estúdio", price: 899.0 },
  { id: 9, name: "Microfone de Lapela Sem Fio", price: 149.0 },
  { id: 10, name: "Headphone Noise Cancelling Pro", price: 649.9 },
  { id: 41, name: "Headphone Retrô Amarelo", price: 279.9 },
  { id: 42, name: "Fone Over-Ear Studio Black", price: 429.0 },
  { id: 43, name: "Microfone Condensador USB", price: 369.0 },
  { id: 44, name: "Caixa de Som Bluetooth à Prova d'Água", price: 319.0 },
  { id: 45, name: "Earbuds TWS Lite", price: 129.9 },
  { id: 46, name: "Headset Gamer 7.1 Surround", price: 389.0 },
  { id: 47, name: "Interface de Áudio USB 2 Canais", price: 749.0 },
  { id: 48, name: "Soundbar Compacta Home", price: 549.0 },
  { id: 49, name: "Fone com Fio Hi-Fi", price: 159.0 },
  { id: 50, name: "Microfone Dinâmico Podcast", price: 299.0 },

  // ------------- PERIFÉRICOS (20 produtos) -------------
  { id: 11, name: "Teclado Mecânico Nimbus", price: 289.0 },
  { id: 12, name: "Teclado Compacto K3", price: 319.0 },
  { id: 13, name: "Mouse Vertex 2", price: 149.5 },
  { id: 14, name: "Mouse Vertical Ergo", price: 179.0 },
  { id: 15, name: "Webcam Pro 4K", price: 529.0 },
  { id: 16, name: "Monitor Ultrawide 29\"", price: 1299.0 },
  { id: 17, name: "Teclado Minimalista Branco", price: 239.9 },
  { id: 18, name: "Controle Wireless Pro", price: 379.0 },
  { id: 19, name: "Mesa Digitalizadora Draw", price: 419.0 },
  { id: 20, name: "Monitor Gamer 144Hz 24\"", price: 1099.0 },
  { id: 51, name: "Teclado Mecânico RGB Full Size", price: 459.0 },
  { id: 52, name: "Teclado Sem Fio Slim", price: 199.0 },
  { id: 53, name: "Mouse Gamer 16000 DPI", price: 219.0 },
  { id: 54, name: "Mouse Sem Fio Silencioso", price: 99.9 },
  { id: 55, name: "Webcam Full HD 1080p", price: 249.0 },
  { id: 56, name: "Monitor 27\" 4K IPS", price: 1899.0 },
  { id: 57, name: "Monitor Portátil 15.6\"", price: 799.0 },
  { id: 58, name: "Controle Gamer Clássico", price: 249.0 },
  { id: 59, name: "Óculos VR Standalone", price: 2499.0 },
  { id: 60, name: "Tablet Gráfico Pen 10\"", price: 559.0 },

  // --------------- ENERGIA (20 produtos) ---------------
  { id: 21, name: "Carregador GaN 65W", price: 129.9 },
  { id: 22, name: "Powerbank Titan 20000mAh", price: 189.9 },
  { id: 23, name: "Base de Carregamento Qi", price: 119.0 },
  { id: 24, name: "Estação de Energia Portátil", price: 890.0 },
  { id: 25, name: "Cabo Magnético Turbo", price: 59.9 },
  { id: 26, name: "Régua de Tomadas Smart", price: 149.9 },
  { id: 27, name: "Adaptador de Tomada Universal", price: 69.9 },
  { id: 28, name: "Cabo USB-C Trançado 2m", price: 45.0 },
  { id: 29, name: "Carregador MagSafe Slim", price: 159.0 },
  { id: 30, name: "Kit Pilhas Recarregáveis AA", price: 79.9 },
  { id: 61, name: "Powerbank Slim 10000mAh", price: 119.9 },
  { id: 62, name: "Carregador Veicular Duplo USB-C", price: 89.9 },
  { id: 63, name: "Carregador de Parede 20W", price: 69.9 },
  { id: 64, name: "Carregador Sem Fio 3 em 1", price: 299.0 },
  { id: 65, name: "Cabo Lightning Reforçado 1m", price: 49.9 },
  { id: 66, name: "Cabo USB-C para USB-C 100W", price: 64.9 },
  { id: 67, name: "Powerbank Solar 25000mAh", price: 229.0 },
  { id: 68, name: "Nobreak Compacto 600VA", price: 459.0 },
  { id: 69, name: "Estação de Carga 6 Portas USB", price: 179.0 },
  { id: 70, name: "Kit Pilhas Recarregáveis AAA", price: 69.9 },

  // -------------- ACESSÓRIOS (20 produtos) --------------
  { id: 31, name: "Hub USB-C Slate 7-em-1", price: 139.0 },
  { id: 32, name: "Suporte Notebook Alumínio", price: 119.9 },
  { id: 33, name: "Deskpad Couro Sintético XL", price: 89.9 },
  { id: 34, name: "Luminária Lightbar Monitor", price: 199.0 },
  { id: 35, name: "Ring Light Desk 10\"", price: 99.9 },
  { id: 36, name: "SSD Externo NVMe 1TB", price: 599.9 },
  { id: 37, name: "Mochila Tech Impermeável", price: 229.9 },
  { id: 38, name: "Roteador Wi-Fi 6 Mesh", price: 449.0 },
  { id: 39, name: "Smartwatch Fit Pro", price: 389.0 },
  { id: 40, name: "Cooler Base Refrigerada", price: 129.0 },
  { id: 71, name: "Smartwatch Sport Max", price: 499.0 },
  { id: 72, name: "Relógio Inteligente Classic", price: 329.0 },
  { id: 73, name: "Suporte Articulado para Monitor", price: 189.0 },
  { id: 74, name: "Suporte para Smartphone", price: 49.9 },
  { id: 75, name: "Pen Drive 128GB USB 3.2", price: 69.9 },
  { id: 76, name: "SSD Externo Portátil 500GB", price: 369.0 },
  { id: 77, name: "Mochila para Notebook 15\"", price: 179.9 },
  { id: 78, name: "Notebook Ultrafino 14\"", price: 3299.0 },
  { id: 79, name: "Câmera de Ação 4K", price: 599.0 },
  { id: 80, name: "Repetidor Wi-Fi Dual Band", price: 159.0 },
];

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));

function getProduct(id) {
  return byId.get(id);
}

module.exports = { PRODUCTS, getProduct };