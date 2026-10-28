import { ShoppingCart, Search, ArrowRight, SlidersHorizontal } from "lucide-react";
import Logo from "./Logo";
import { PRODUCTS } from "../data/products";
import { formatBRL } from "../utils/format";

export default function HomeScreen({ cartCount, onOpenCart, onAdd }) {
  return (
    <div className="screen">
      <div className="home-header-bar">
        <div className="home-header content-wrap">
          <div className="brand">
            <Logo size={30} />
            <span className="brand-name">PixelTech</span>
          </div>
          <button className="icon-btn cart-btn" onClick={onOpenCart} aria-label="Carrinho">
            <ShoppingCart size={20} />
            {cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      <div className="content-wrap">
        <div className="hero">
          <p className="hero-eyebrow">Sua loja de tecnologia</p>
          <h1 className="hero-title">Feito para quem monta o próprio setup.</h1>
        </div>

        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Buscar produtos..." />
          <button className="search-action" aria-label="Buscar por voz">
            <ArrowRight size={14} />
          </button>
          <button className="search-filter" aria-label="Filtros">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="chip-row">
          {["Tudo", "Áudio", "Periféricos", "Energia", "Acessórios"].map((c, i) => (
            <button key={c} className={`chip ${i === 0 ? "chip-active" : ""}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.id} className="product-card">
                {p.tag && <span className="product-tag">{p.tag}</span>}
                <div className="product-thumb">
                  <Icon size={40} strokeWidth={1.5} color="#1C1B22" />
                </div>
                <div className="product-info">
                  <p className="product-category">{p.category}</p>
                  <p className="product-name">{p.name}</p>
                  <div className="product-bottom">
                    <span className="product-price">{formatBRL(p.price)}</span>
                    <button className="add-btn" onClick={() => onAdd(p)} aria-label="Adicionar">
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}