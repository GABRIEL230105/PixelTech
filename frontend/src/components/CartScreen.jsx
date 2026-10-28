import { ChevronLeft, Trash2, ArrowRight } from "lucide-react";
import Logo from "./Logo";
import { formatBRL } from "../utils/format";

export default function CartScreen({ items, onBack, onRemove, onCheckout }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="screen">
      <div className="home-header-bar">
        <div className="cart-header content-wrap">
          <button className="icon-btn" onClick={onBack} aria-label="Voltar">
            <ChevronLeft size={20} />
          </button>
          <Logo size={26} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">Seu carrinho ainda está vazio.</p>
        </div>
      ) : (
        <div className="narrow-wrap">
          <div className="cart-list">
            {items.map((i) => (
              <div key={i.id} className="cart-row">
                <div className="cart-thumb" />
                <div className="cart-row-info">
                  <p className="cart-row-name">{i.name}</p>
                  <p className="cart-row-meta">
                    Qtd. {i.qty} · {formatBRL(i.price)}
                  </p>
                </div>
                <button className="icon-btn" onClick={() => onRemove(i.id)} aria-label="Remover">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatBRL(total)}</span>
            </div>
            <div className="summary-row">
              <span>Frete</span>
              <span>Grátis</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>{formatBRL(total)}</span>
            </div>
            <button className="primary-btn" onClick={onCheckout}>
              Finalizar compra
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}