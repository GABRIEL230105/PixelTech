# Testes do backend

```
npm test              # roda tudo uma vez
npm run test:watch    # roda de novo toda vez que você salva um arquivo
npx jest tests/integration/payments.test.js    # roda só um arquivo
```

Não precisa de MongoDB ligado, de internet, de Gmail nem de Mercado Pago, e **nenhum teste lê o seu `.env`**.

## O que tem aqui

| Pasta | O que testa |
|---|---|
| `integration/` | A API de verdade (Express + rotas + token + controllers + validação dos modelos), fazendo requisições HTTP. |
| `unit/` | Funções isoladas: cálculo de preços, assinatura do webhook, conferência do `.env`, texto do e-mail, tradução de erros. |
| `helpers/` | Peças de apoio dos testes (banco simulado, Mercado Pago simulado, atalhos). |

O arquivo `integration/checkout-flow.test.js` é a jornada inteira: cadastro, código por e-mail, login, pedido, link de pagamento, webhook, pedido pago e e-mail de confirmação.

## O que é simulado (e o que não é)

- **Banco de dados:** `helpers/fakeDb.js` troca as consultas ao MongoDB por arrays em memória. Os modelos são os reais, então validação, conversão de id e hash da senha acontecem de verdade.
- **Mercado Pago e e-mail:** simulados. Os testes decidem o que o Mercado Pago "responde" e conferem o que o servidor "enviaria".

Por isso estes testes **não substituem** uma compra de teste de verdade (Mongo, Gmail e Mercado Pago reais) de vez em quando. O que eles garantem é que a lógica do seu código continua correta a cada mudança.

## Quando um teste falhar

1. Leia o nome do teste: ele diz em português o comportamento que quebrou.
2. Se foi de propósito (você mudou uma mensagem ou regra), atualize o teste.
3. Se não foi, o teste acabou de te salvar de um bug.

O teste `catálogo do servidor x vitrine do front` falha se o preço de um produto for diferente em `backend/data/catalog.js` e `frontend/src/data/products.js`.