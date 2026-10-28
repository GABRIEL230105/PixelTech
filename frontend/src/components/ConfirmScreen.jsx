import Logo from "./Logo";

export default function ConfirmScreen({ onBackToHome }) {
  return (
    <div className="screen">
      <div className="confirm-wrap">
        <div className="confirm-icon">
          <Logo size={40} />
        </div>
        <h2 className="confirm-title">Pedido confirmado!</h2>
        <p className="confirm-sub">
          Obrigado por comprar na PixelTech. Você vai receber os detalhes por e-mail.
        </p>
        <button className="primary-btn" onClick={onBackToHome}>
          Voltar para a loja
        </button>
      </div>
    </div>
  );
}