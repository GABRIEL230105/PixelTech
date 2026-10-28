// Tratamento de erros centralizado.
//
// - sendError(): usado nos "catch" dos controllers. Traduz erros conhecidos (id inválido,
//   campo inválido, e-mail repetido...) em respostas 4xx claras e deixa o 500 só pra erro
//   inesperado, sem vazar detalhes internos pro navegador.
// - notFound / errorHandler: ficam no fim do app.js e garantem que TODA resposta de erro
//   seja JSON { error: "..." } (o Express, sozinho, devolve uma página HTML).

const Sentry = require("@sentry/node");

const FIELD_NAMES = { name: "nome", email: "e-mail", password: "senha", nome: "nome", telefone: "telefone" };

// Devolve { status, message } pra erros que a gente conhece, ou null pros demais.
function translateError(error) {
  if (!error) return null;

  // Corpo da requisição com JSON quebrado ou grande demais (vem do express.json)
  if (error.type === "entity.parse.failed") {
    return { status: 400, message: "O corpo da requisição não é um JSON válido." };
  }
  if (error.type === "entity.too.large") {
    return { status: 413, message: "A requisição é grande demais." };
  }

  // Valor que não tem o formato do campo (ex: /api/orders/abc, onde se espera um id)
  if (error.name === "CastError") {
    if (error.path === "_id" || error.kind === "ObjectId") {
      return { status: 400, message: "Identificador inválido." };
    }
    return { status: 400, message: "Dados inválidos." };
  }

  // Campo obrigatório faltando ou com formato errado no modelo
  if (error.name === "ValidationError" && error.errors) {
    if (error.errors.email) return { status: 400, message: "E-mail inválido." };
    const fields = Object.keys(error.errors).map((f) => FIELD_NAMES[f] || f);
    return { status: 400, message: `Dados inválidos (${fields.join(", ")}).` };
  }

  // Valor repetido em campo único (ex: duas contas com o mesmo e-mail ao mesmo tempo)
  if (error.code === 11000) {
    if (error.keyPattern && error.keyPattern.email) {
      return { status: 409, message: "Já existe uma conta com esse e-mail." };
    }
    return { status: 409, message: "Já existe um registro com esses dados." };
  }

  // Outros erros 4xx gerados pelo próprio Express/body-parser (ex: codificação não suportada)
  if (error.expose === true && error.status >= 400 && error.status < 500) {
    return { status: error.status, message: "Requisição inválida." };
  }

  return null;
}

// Responde com o erro certo. Só erro inesperado vira 500 (e vai inteiro pro log do servidor).
function sendError(res, error, fallbackMessage, { exposeDetails = false } = {}) {
  const known = translateError(error);
  if (known) {
    return res.status(known.status).json({ error: known.message });
  }

  // Envia o erro inesperado (500) para o Sentry antes de devolver a resposta
  Sentry.captureException(error);
  console.error(fallbackMessage, error);

  const body = { error: fallbackMessage };
  // Em desenvolvimento, devolve o motivo (ex: "credencial recusada") pra facilitar o diagnóstico
  if (exposeDetails && process.env.NODE_ENV !== "production" && error && error.message) {
    body.details = error.message;
  }
  return res.status(500).json(body);
}

// Rota que não existe
function notFound(req, res) {
  res.status(404).json({ error: "Rota não encontrada." });
}

// Último recurso: erros que ninguém tratou (o Express reconhece pelos 4 parâmetros)
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  sendError(res, error, "Erro interno do servidor.");
}

module.exports = { sendError, notFound, errorHandler, translateError };