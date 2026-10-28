// Confere o .env quando o servidor sobe e avisa, em português, o que está faltando ou
// parece errado (valor de exemplo, chaves trocadas de lugar, endereço localhost...).
// Em desenvolvimento só avisa; em produção (NODE_ENV=production) recusa subir com pendências.

const PLACEHOLDERS = ["cole_aqui", "troque_isso", "seuemail@gmail.com", "sua_senha_de_app"];

function inspectEnv(env) {
  const problems = [];
  const warnings = [];

  const isSet = (name) => typeof env[name] === "string" && env[name].trim() !== "";

  function need(name, why) {
    if (!isSet(name)) {
      problems.push(`${name} está vazio: ${why}.`);
      return false;
    }
    if (PLACEHOLDERS.some((p) => env[name].includes(p))) {
      problems.push(`${name} ainda está com o valor de exemplo: ${why}.`);
      return false;
    }
    return true;
  }

  const isProduction = env.NODE_ENV === "production";
  // Em produção a verificação de assinatura nunca é desligada
  const verifyingSignature = env.MP_VERIFY_SIGNATURE !== "false" || isProduction;

  if (need("JWT_SECRET", "sem ele o login não funciona") && env.JWT_SECRET.length < 32) {
    warnings.push("JWT_SECRET é curto (menos de 32 caracteres). Use um texto longo e aleatório.");
  }
  need("EMAIL_USER", "sem ele o código de verificação e o e-mail de confirmação não são enviados");
  need("EMAIL_PASS", "sem ela o código de verificação e o e-mail de confirmação não são enviados");

  if (need("MP_ACCESS_TOKEN", "sem ele o checkout do Mercado Pago não funciona")) {
    const token = env.MP_ACCESS_TOKEN.trim();
    if (!/^(APP_USR|TEST)-/.test(token)) {
      const looksLikeSecret = /^[0-9a-f]{64}$/i.test(token);
      warnings.push(
        looksLikeSecret
          ? "MP_ACCESS_TOKEN parece a assinatura secreta do webhook (64 letras e números). Confira se MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET não estão trocados."
          : "MP_ACCESS_TOKEN não parece um Access Token (costuma começar com APP_USR- ou TEST-)."
      );
    }
  }

  if (verifyingSignature) {
    if (need("MP_WEBHOOK_SECRET", "sem ela o webhook recusa as notificações do Mercado Pago")) {
      if (/^(APP_USR|TEST)-/.test(env.MP_WEBHOOK_SECRET.trim())) {
        warnings.push(
          "MP_WEBHOOK_SECRET parece um Access Token, não a assinatura secreta do webhook. Confira se não estão trocados."
        );
      }
    }
  } else {
    warnings.push("A verificação de assinatura do webhook está DESLIGADA (MP_VERIFY_SIGNATURE=false). Use só em desenvolvimento.");
  }

  if (need("BACKEND_URL", "o Mercado Pago usa esse endereço pra avisar que o pagamento foi aprovado")) {
    const url = env.BACKEND_URL.trim();
    if (!/^https?:\/\//.test(url)) {
      warnings.push("BACKEND_URL precisa começar com http:// ou https://.");
    } else if (/localhost|127\.0\.0\.1/.test(url)) {
      warnings.push(
        "BACKEND_URL aponta pra localhost: o Mercado Pago não consegue chamar o seu computador, então o status do pedido não vai atualizar. Use o link público do ngrok."
      );
    }
    if (url.endsWith("/")) {
      warnings.push("BACKEND_URL não deve terminar com barra (/).");
    }
  }

  return { problems, warnings };
}

function checkEnv(env = process.env) {
  const { problems, warnings } = inspectEnv(env);

  if (problems.length > 0 || warnings.length > 0) {
    console.warn("\n[config] Conferência do .env:");
    problems.forEach((p) => console.warn(`  [problema] ${p}`));
    warnings.forEach((w) => console.warn(`  [atenção] ${w}`));
    console.warn("");
  }

  if (problems.length > 0) {
    if (env.NODE_ENV === "production") {
      console.error("[config] Em produção o servidor não sobe com essas pendências.");
      process.exit(1);
    }
    console.warn("[config] O servidor vai subir mesmo assim, mas as partes citadas acima não vão funcionar.\n");
  }

  return { problems, warnings };
}

module.exports = { checkEnv, inspectEnv };