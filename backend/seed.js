require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  // ÁUDIO (1-10 e 41-50)
  { id: 1, name: "Fone Aurora Pro", category: "Áudio", price: 349.90 },
  { id: 2, name: "Headset Gamer Órion", category: "Áudio", price: 299.90 },
  { id: 3, name: "Microfone Studio Pod", category: "Áudio", price: 459.00 },
  { id: 4, name: "Soundbar Echo 2.1", category: "Áudio", price: 399.00 },
  { id: 5, name: "Earbuds TWS Sense", category: "Áudio", price: 199.90 },
  { id: 6, name: "Caixa de Som Portátil", category: "Áudio", price: 259.90 },
  { id: 7, name: "Fone Esportivo Bluetooth", category: "Áudio", price: 189.90 },
  { id: 8, name: "Monitor de Áudio Estúdio", category: "Áudio", price: 899.00 },
  { id: 9, name: "Microfone de Lapela Sem Fio", category: "Áudio", price: 149.00 },
  { id: 10, name: "Headphone Noise Cancelling Pro", category: "Áudio", price: 649.90 },
  { id: 41, name: "Headphone Retrô Amarelo", category: "Áudio", price: 279.90 },
  { id: 42, name: "Fone Over-Ear Studio Black", category: "Áudio", price: 429.00 },
  { id: 43, name: "Microfone Condensador USB", category: "Áudio", price: 369.00 },
  { id: 44, name: "Caixa de Som Bluetooth à Prova d'Água", category: "Áudio", price: 319.00 },
  { id: 45, name: "Earbuds TWS Lite", category: "Áudio", price: 129.90 },
  { id: 46, name: "Headset Gamer 7.1 Surround", category: "Áudio", price: 389.00 },
  { id: 47, name: "Interface de Áudio USB 2 Canais", category: "Áudio", price: 749.00 },
  { id: 48, name: "Soundbar Compacta Home", category: "Áudio", price: 549.00 },
  { id: 49, name: "Fone com Fio Hi-Fi", category: "Áudio", price: 159.00 },
  { id: 50, name: "Microfone Dinâmico Podcast", category: "Áudio", price: 299.00 },

  // PERIFÉRICOS (11-20 e 51-60)
  { id: 11, name: "Teclado Mecânico Nimbus", category: "Periféricos", price: 289.00 },
  { id: 12, name: "Teclado Compacto K3", category: "Periféricos", price: 319.00 },
  { id: 13, name: "Mouse Vertex 2", category: "Periféricos", price: 149.50 },
  { id: 14, name: "Mouse Vertical Ergo", category: "Periféricos", price: 179.00 },
  { id: 15, name: "Webcam Pro 4K", category: "Periféricos", price: 529.00 },
  { id: 16, name: "Monitor Ultrawide 29\"", category: "Periféricos", price: 1299.00 },
  { id: 17, name: "Teclado Minimalista Branco", category: "Periféricos", price: 239.90 },
  { id: 18, name: "Controle Wireless Pro", category: "Periféricos", price: 379.00 },
  { id: 19, name: "Mesa Digitalizadora Draw", category: "Periféricos", price: 419.00 },
  { id: 20, name: "Monitor Gamer 144Hz 24\"", category: "Periféricos", price: 1099.00 },
  { id: 51, name: "Teclado Mecânico RGB Full Size", category: "Periféricos", price: 459.00 },
  { id: 52, name: "Teclado Sem Fio Slim", category: "Periféricos", price: 199.00 },
  { id: 53, name: "Mouse Gamer 16000 DPI", category: "Periféricos", price: 219.00 },
  { id: 54, name: "Mouse Sem Fio Silencioso", category: "Periféricos", price: 99.90 },
  { id: 55, name: "Webcam Full HD 1080p", category: "Periféricos", price: 249.00 },
  { id: 56, name: "Monitor 27\" 4K IPS", category: "Periféricos", price: 1899.00 },
  { id: 57, name: "Monitor Portátil 15.6\"", category: "Periféricos", price: 799.00 },
  { id: 58, name: "Controle Gamer Clássico", category: "Periféricos", price: 249.00 },
  { id: 59, name: "Óculos VR Standalone", category: "Periféricos", price: 2499.00 },
  { id: 60, name: "Tablet Gráfico Pen 10\"", category: "Periféricos", price: 559.00 },

  // ENERGIA (21-30 e 61-70)
  { id: 21, name: "Carregador GaN 65W", category: "Energia", price: 129.90 },
  { id: 22, name: "Powerbank Titan 20000mAh", category: "Energia", price: 189.90 },
  { id: 23, name: "Base de Carregamento Qi", category: "Energia", price: 119.00 },
  { id: 24, name: "Estação de Energia Portátil", category: "Energia", price: 890.00 },
  { id: 25, name: "Cabo Magnético Turbo", category: "Energia", price: 59.90 },
  { id: 26, name: "Régua de Tomadas Smart", category: "Energia", price: 149.90 },
  { id: 27, name: "Adaptador de Tomada Universal", category: "Energia", price: 69.90 },
  { id: 28, name: "Cabo USB-C Trançado 2m", category: "Energia", price: 45.00 },
  { id: 29, name: "Carregador MagSafe Slim", category: "Energia", price: 159.00 },
  { id: 30, name: "Kit Pilhas Recarregáveis AA", category: "Energia", price: 79.90 },
  { id: 61, name: "Powerbank Slim 10000mAh", category: "Energia", price: 119.90 },
  { id: 62, name: "Carregador Veicular Duplo USB-C", category: "Energia", price: 89.90 },
  { id: 63, name: "Carregador de Parede 20W", category: "Energia", price: 69.90 },
  { id: 64, name: "Carregador Sem Fio 3 em 1", category: "Energia", price: 299.00 },
  { id: 65, name: "Cabo Lightning Reforçado 1m", category: "Energia", price: 49.90 },
  { id: 66, name: "Cabo USB-C para USB-C 100W", category: "Energia", price: 64.90 },
  { id: 67, name: "Powerbank Solar 25000mAh", category: "Energia", price: 229.00 },
  { id: 68, name: "Nobreak Compacto 600VA", category: "Energia", price: 459.00 },
  { id: 69, name: "Estação de Carga 6 Portas USB", category: "Energia", price: 179.00 },
  { id: 70, name: "Kit Pilhas Recarregáveis AAA", category: "Energia", price: 69.90 },

  // ACESSÓRIOS (31-40 e 71-80)
  { id: 31, name: "Hub USB-C Slate 7-em-1", category: "Acessórios", price: 139.00 },
  { id: 32, name: "Suporte Notebook Alumínio", category: "Acessórios", price: 119.90 },
  { id: 33, name: "Deskpad Couro Sintético XL", category: "Acessórios", price: 89.90 },
  { id: 34, name: "Luminária Lightbar Monitor", category: "Acessórios", price: 199.00 },
  { id: 35, name: "Ring Light Desk 10\"", category: "Acessórios", price: 99.90 },
  { id: 36, name: "SSD Externo NVMe 1TB", category: "Acessórios", price: 599.90 },
  { id: 37, name: "Mochila Tech Impermeável", category: "Acessórios", price: 229.90 },
  { id: 38, name: "Roteador Wi-Fi 6 Mesh", category: "Acessórios", price: 449.00 },
  { id: 39, name: "Smartwatch Fit Pro", category: "Acessórios", price: 389.00 },
  { id: 40, name: "Cooler Base Refrigerada", category: "Acessórios", price: 129.00 },
  { id: 71, name: "Smartwatch Sport Max", category: "Acessórios", price: 499.00 },
  { id: 72, name: "Relógio Inteligente Classic", category: "Acessórios", price: 329.00 },
  { id: 73, name: "Suporte Articulado para Monitor", category: "Acessórios", price: 189.00 },
  { id: 74, name: "Suporte para Smartphone", category: "Acessórios", price: 49.90 },
  { id: 75, name: "Pen Drive 128GB USB 3.2", category: "Acessórios", price: 69.90 },
  { id: 76, name: "SSD Externo Portátil 500GB", category: "Acessórios", price: 369.00 },
  { id: 77, name: "Mochila para Notebook 15\"", category: "Acessórios", price: 179.90 },
  { id: 78, name: "Notebook Ultrafino 14\"", category: "Acessórios", price: 3299.00 },
  { id: 79, name: "Câmera de Ação 4K", category: "Acessórios", price: 599.00 },
  { id: 80, name: "Repetidor Wi-Fi Dual Band", category: "Acessórios", price: 159.00 }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("80 produtos cadastrados com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro ao popular banco:", err);
    process.exit(1);
  }
}

seedDB();