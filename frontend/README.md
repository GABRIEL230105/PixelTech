# 🛒 PixelTech - E-commerce de Tecnologia

Plataforma *full-stack* de comércio eletrónico desenvolvida como projeto académico final. O sistema oferece uma experiência de compra ágil, com catálogo de produtos, gestão de carrinho de compras, registo seguro de utilizadores e processamento de pagamentos através do Mercado Pago.

## 🚀 Links em Produção
- **Frontend (Aplicação):** https://pixel-tech-chi.vercel.app
- **Backend (API):** Hospedado no Render (`https://pixeltech-obxa.onrender.com/api`)

## 🛠️ Tecnologias e Arquitetura

### Frontend
- **React.js** com **Vite** para renderização rápida do lado do cliente.
- **Lucide React** para iconografia.

### Backend
- **Node.js** com **Express.js** para construção da API RESTful.
- **MongoDB** com **Mongoose** para modelagem de dados (Base de Dados NoSQL).
- **JSON Web Tokens (JWT) & Bcrypt.js** para autenticação e encriptação de palavras-passe.
- **Mercado Pago SDK** para geração do *checkout* de pagamentos.

### Infraestrutura, Segurança e Observabilidade
- **Hospedagem e Deploy:** Vercel (Frontend) e Render (Backend).
- **Integração Contínua (CI):** GitHub Actions configurado para testes automáticos de *workflows*.
- **Segurança da API:** Utilização de `Helmet` para proteção de cabeçalhos HTTP e `express-rate-limit` contra tráfego abusivo (DDoS e força bruta).
- **Monitorização:** Sentry integrado no *backend* para captura de exceções e observabilidade em tempo real.

## ✨ Funcionalidades Principais
- Registo e autenticação imediata de utilizadores (via JWT gerido via `localStorage`).
- Adição, ajuste de quantidades e remoção de produtos no carrinho.
- Criação e persistência de pedidos na base de dados (MongoDB).
- Redirecionamento seguro para a plataforma de pagamento do Mercado Pago e validação de sessão em fluxos críticos.

## 💻 Como Executar Localmente

### Pré-requisitos
- Node.js (v18+)
- Cluster MongoDB (Atlas ou local)
- Credenciais de teste do Mercado Pago

### 1. Instalação e Execução do Backend
Crie um ficheiro `.env` na pasta `backend` com as seguintes variáveis estruturais:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/projeto_integrador
JWT_SECRET=oitoierutwtgutht5y9ty549wgfuysgffuywgfuyigfuywgqwhdiuaandhhifugery
EMAIL_USER=unirota.app@gmail.com
EMAIL_PASS=fzwy miwu sblm ibcf
MP_ACCESS_TOKEN=APP_USR-8535531719508634-100314-3fef23cef999988b974c3b99f925e8ec-3732708659
MP_WEBHOOK_SECRET=d57314138343828498ceb9b47f8fa4c9a18c6eb326cdef4f2ca931b4c660b548
BACKEND_URL=https://that-overblown-obtain.ngrok-free.dev
MP_VERIFY_SIGNATURE=false
 
