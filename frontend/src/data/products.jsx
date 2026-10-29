import { 
  Headphones, 
  Headset, 
  Mic, 
  Speaker, 
  Keyboard, 
  Mouse, 
  Camera, 
  Plug, 
  Battery, 
  Zap, 
  BatteryCharging, 
  Cable, 
  Usb, 
  Laptop, 
  Square, 
  Monitor, 
  Aperture, 
  Calculator, 
  Video, 
  Power, 
  HardDrive, 
  Briefcase 
} from "lucide-react";

export const PRODUCTS = [
  // ---------------- ÁUDIO ----------------
  { id: 1, name: "Fone Aurora Pro", category: "Áudio", price: 349.90, tag: "Novo", icon: Headphones },
  { id: 2, name: "Headset Gamer Órion", category: "Áudio", price: 299.90, icon: Headset },
  { id: 3, name: "Microfone Studio Pod", category: "Áudio", price: 459.00, icon: Mic },
  { id: 4, name: "Soundbar Echo 2.1", category: "Áudio", price: 399.00, icon: Speaker },
  { id: 5, name: "Earbuds TWS Sense", category: "Áudio", price: 199.90, tag: "Oferta", icon: Headphones },

  // ------------- PERIFÉRICOS -------------
  { id: 6, name: "Teclado Mecânico Nimbus", category: "Periféricos", price: 289.00, icon: Keyboard },
  { id: 7, name: "Teclado Compacto K3", category: "Periféricos", price: 319.00, tag: "Novo", icon: Keyboard },
  { id: 8, name: "Mouse Vertex 2", category: "Periféricos", price: 149.50, icon: Mouse },
  { id: 9, name: "Mouse Vertical Ergo", category: "Periféricos", price: 179.00, icon: Mouse },
  { id: 10, name: "Webcam Pro 4K", category: "Periféricos", price: 529.00, icon: Camera },

  // --------------- ENERGIA ---------------
  { id: 11, name: "Carregador GaN 65W", category: "Energia", price: 129.90, icon: Plug },
  { id: 12, name: "Powerbank Titan 20000mAh", category: "Energia", price: 189.90, icon: Battery },
  { id: 13, name: "Base de Carregamento Qi", category: "Energia", price: 119.00, tag: "Oferta", icon: Zap },
  { id: 14, name: "Nobreak Mini 600VA", category: "Energia", price: 450.00, icon: BatteryCharging },
  { id: 15, name: "Cabo Magnético Turbo", category: "Energia", price: 59.90, icon: Cable },

  // -------------- ACESSÓRIOS --------------
  { id: 16, name: "Hub USB-C Slate", category: "Acessórios", price: 99.00, icon: Usb },
  { id: 17, name: "Suporte Notebook Halo", category: "Acessórios", price: 79.90, tag: "Oferta", icon: Laptop },
  { id: 18, name: "Mousepad XL Control", category: "Acessórios", price: 69.90, icon: Square },
  { id: 19, name: "Monitor Stand Articulado", category: "Acessórios", price: 249.00, icon: Monitor },
  { id: 20, name: "Ring Light Desk", category: "Acessórios", price: 89.90, icon: Aperture },

  // -------------- NOVOS 10 PRODUTOS --------------
  { id: 21, name: "Caixa de Som Portátil", category: "Áudio", price: 259.90, icon: Speaker },
  { id: 22, name: "Fone Esportivo Bluetooth", category: "Áudio", price: 189.90, tag: "Oferta", icon: Headphones },
  { id: 23, name: "Monitor Ultrawide 29\"", category: "Periféricos", price: 1299.00, tag: "Novo", icon: Monitor },
  { id: 24, name: "Teclado Numérico sem fio", category: "Periféricos", price: 89.90, icon: Calculator },
  { id: 25, name: "WebCam Stream HD", category: "Periféricos", price: 349.00, icon: Video },
  { id: 26, name: "Filtro de Linha Smart", category: "Energia", price: 149.90, icon: Power },
  { id: 27, name: "Carregador Veicular Fast", category: "Energia", price: 59.90, icon: Zap },
  { id: 28, name: "Cabo USB-C Trançado 2m", category: "Energia", price: 45.00, icon: Usb },
  { id: 29, name: "SSD Externo 1TB", category: "Acessórios", price: 599.90, tag: "Novo", icon: HardDrive },
  { id: 30, name: "Mochila Tech Antifurto", category: "Acessórios", price: 219.90, icon: Briefcase }
];