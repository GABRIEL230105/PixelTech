// Variáveis de ambiente SÓ dos testes. O dotenv nunca é carregado aqui, então os
// testes não leem o seu .env e nunca usam suas credenciais de verdade.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
process.env.MP_ACCESS_TOKEN = "TEST-token-falso-dos-testes";
process.env.MP_WEBHOOK_SECRET = "chave-secreta-do-webhook-de-teste";
process.env.EMAIL_USER = "teste@exemplo.com";
process.env.EMAIL_PASS = "senha-falsa";
process.env.BACKEND_URL = "https://exemplo-de-teste.ngrok-free.dev";
delete process.env.MP_VERIFY_SIGNATURE;