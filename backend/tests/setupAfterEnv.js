// Silencia os console.log do servidor (ex: "E-mail de confirmação enviado") para a saída dos
// testes ficar limpa. Quem precisa ver ou checar o log cria o próprio espião no teste.
beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});