import { useState } from "react";
import { ShoppingCart, Search, ArrowRight, SlidersHorizontal } from "lucide-react";
import Logo from "./Logo";
import { PRODUCTS } from "../data/products";
import { formatBRL } from "../utils/format";

export default function HomeScreen({ cartCount, onOpenCart, onAdd }) {
  const [activeCategory, setActiveCategory] = useState("Tudo");
  const [searchQuery, setSearchQuery] = useState(""); // Novo estado para o texto da busca

  const categories = ["Tudo", "Áudio", "Periféricos", "Energia", "Acessórios"];

  // Filtra os produtos combinando a categoria selecionada E o texto digitado na busca
  const filteredProducts = PRODUCTS.filter((p) => {
    const matchCategory = activeCategory === "Tudo" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

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
          <input 
            type="text" 
            placeholder="Buscar produtos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} // Atualiza o filtro a cada letra digitada
          />
          <button className="search-action" aria-label="Buscar">
            <ArrowRight size={14} />
          </button>
          <button className="search-filter" aria-label="Filtros">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="chip-row">
          {categories.map((c) => (
            <button 
              key={c} 
              className={`chip ${activeCategory === c ? "chip-active" : ""}`}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const IconComponent = p.icon; // O ícone já vem direto do arquivo de produtos
              
              return (
                <div key={p.id} className="product-card">
                  {(p.badge || p.tag) && <span className="product-tag">{p.badge || p.tag}</span>}
                  
                  <div className="product-thumb">
                    {IconComponent && <IconComponent size={40} strokeWidth={1.5} color="#1C1B22" />}
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
            })
          ) : (
            // Mensagem de ecrã vazio caso a pesquisa não encontre nada
            <div style={{ width: "100%", textAlign: "center", padding: "2rem", color: "#666" }}>
              <p>Nenhum produto encontrado com "{searchQuery}".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}