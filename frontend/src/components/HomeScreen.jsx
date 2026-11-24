import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Search,
  ArrowRight,
  SlidersHorizontal,
  X,
  ClipboardList,
  Package,
} from "lucide-react";
import Logo from "./Logo";
import { PRODUCTS } from "../data/products";
import { formatBRL } from "../utils/format";

const DEFAULT_API_URL = "https://pixeltech-obxa.onrender.com/api";

export default function HomeScreen({
  cartCount,
  onOpenCart,
  onOpenConsulta,
  onAdd,
  apiUrl = DEFAULT_API_URL,
}) {
  const [activeCategory, setActiveCategory] = useState("Tudo");
  const [searchQuery, setSearchQuery] = useState("");
  const [failedImages, setFailedImages] = useState({});
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [extraProducts, setExtraProducts] = useState([]);

  const categories = ["Tudo", "Áudio", "Periféricos", "Energia", "Acessórios"];

  // Carrega os produtos cadastrados pelo administrador no MongoDB
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicProducts() {
      try {
        const res = await fetch(`${apiUrl}/products`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.products)) {
          const normalized = data.products.map((item) => ({
            ...item,
            icon: Package,
          }));
          setExtraProducts(normalized);
        }
      } catch {
        // Mantém os 80 produtos padrão caso o servidor esteja iniciando
      }
    }

    loadDynamicProducts();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  // Junta os produtos novos (no topo) com os 80 produtos padrão sem duplicar IDs
  const extraIds = new Set(extraProducts.map((item) => item.id));
  const allProducts = [
    ...extraProducts,
    ...PRODUCTS.filter((item) => !extraIds.has(item.id)),
  ];

  const filteredProducts = allProducts.filter((p) => {
    const matchCategory = activeCategory === "Tudo" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleImageError = (id) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const getDescription = (product) => {
    if (product.description) return product.description;
    return `${product.name} — equipamento da linha ${product.category} da PixelTech, projetado para entregar alto desempenho, durabilidade e acabamento minimalista para o seu setup.`;
  };

  // Fecha o modal com Esc e trava o scroll da página enquanto ele está aberto
  useEffect(() => {
    if (!selectedProduct) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedProduct(null);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  const ModalIcon = selectedProduct?.icon;
  const modalHasImage = selectedProduct?.image && !failedImages[selectedProduct.id];

  return (
    <div className="screen">
      <div className="home-header-bar">
        <div className="home-header content-wrap">
          <div className="brand">
            <Logo size={30} />
            <span className="brand-name">PixelTech</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              onClick={() => onOpenConsulta && onOpenConsulta()}
              title="Painel Administrativo (Pedidos, Produtos, Leads e Clientes)"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                backgroundColor: "transparent",
                border: "1px solid #E4E4E7",
                borderRadius: "999px",
                padding: "0.45rem 0.85rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#1C1B22",
                cursor: "pointer",
              }}
            >
              <ClipboardList size={16} />
              <span>Administrador</span>
            </button>
            <button className="icon-btn cart-btn" onClick={onOpenCart} aria-label="Carrinho">
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </button>
          </div>
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
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div className="results-bar">
          <h2 className="results-title">
            {activeCategory === "Tudo" ? "Todos os produtos" : activeCategory}
          </h2>
          <span className="results-count">
            {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
          </span>
        </div>

        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p) => {
              const IconComponent = p.icon;
              const showImage = p.image && !failedImages[p.id];

              return (
                <div
                  key={p.id}
                  className="product-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedProduct(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedProduct(p);
                    }
                  }}
                >
                  {(p.badge || p.tag) && <span className="product-tag">{p.badge || p.tag}</span>}

                  <div className="product-thumb">
                    {showImage ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        loading="lazy"
                        onError={() => handleImageError(p.id)}
                      />
                    ) : (
                      IconComponent && <IconComponent size={40} strokeWidth={1.5} color="#1C1B22" />
                    )}
                  </div>

                  <div className="product-info">
                    <p className="product-category">{p.category}</p>
                    <p className="product-name">{p.name}</p>
                    <div className="product-bottom">
                      <span className="product-price">{formatBRL(p.price)}</span>
                      <button
                        className="add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdd(p);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        aria-label={`Adicionar ${p.name} ao carrinho`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <p>Nenhum produto encontrado com "{searchQuery}".</p>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className="pd-overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="pd-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedProduct.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="pd-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Fechar detalhes"
            >
              <X size={18} />
            </button>

            <div className="pd-media">
              {modalHasImage ? (
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  onError={() => handleImageError(selectedProduct.id)}
                />
              ) : (
                ModalIcon && <ModalIcon size={64} strokeWidth={1.5} color="#1C1B22" />
              )}
            </div>

            <div className="pd-body">
              <span className="pd-category">{selectedProduct.category}</span>
              <h2 className="pd-title">{selectedProduct.name}</h2>
              <p className="pd-desc">{getDescription(selectedProduct)}</p>

              <div className="pd-footer">
                <div>
                  <span className="pd-price-label">Preço à vista</span>
                  <strong className="pd-price">{formatBRL(selectedProduct.price)}</strong>
                </div>

                <button
                  className="pd-cta"
                  onClick={() => {
                    onAdd(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}