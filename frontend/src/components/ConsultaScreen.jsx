import { useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Package,
  Users,
  UserCheck,
  Lock,
  LogOut,
  ShoppingBag,
  PlusCircle,
  Trash2,
} from "lucide-react";
import Logo from "./Logo";
import { formatBRL } from "../utils/format";

const DEFAULT_API_URL = "https://pixeltech-obxa.onrender.com/api";
const CATEGORIES = ["Áudio", "Periféricos", "Energia", "Acessórios"];

export default function ConsultaScreen({ onBack, apiUrl = DEFAULT_API_URL }) {
  const [token, setToken] = useState(() => localStorage.getItem("pixeltech_token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState("pedidos");
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Estados do formulário de novo produto
  const [prodName, setProdName] = useState("");
  const [prodCategory, setProdCategory] = useState("Áudio");
  const [prodPrice, setProdPrice] = useState("");
  const [prodTag, setProdTag] = useState("Novo");
  const [prodImage, setProdImage] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodLoading, setProdLoading] = useState(false);
  const [prodMessage, setProdMessage] = useState({ type: "", text: "" });

  const handleLogout = () => {
    localStorage.removeItem("pixeltech_token");
    localStorage.removeItem("pixeltech_user");
    setToken("");
    setOrders([]);
    setLeads([]);
    setUsers([]);
    setProducts([]);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "E-mail ou senha inválidos.");
      }

      const receivedToken = data.token || data.accessToken;
      if (!receivedToken) {
        throw new Error("Token de autenticação não recebido.");
      }

      localStorage.setItem("pixeltech_token", receivedToken);
      if (data.user) {
        localStorage.setItem("pixeltech_user", JSON.stringify(data.user));
      }
      setToken(receivedToken);
      setPassword("");
    } catch (err) {
      setLoginError(err.message || "Não foi possível conectar ao servidor.");
    } finally {
      setLoginLoading(false);
    }
  };

  const carregarDados = async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiUrl}/consulta`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        handleLogout();
        setLoginError(data.error || "Sessão expirada. Entre novamente.");
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status} ao buscar registros.`);
      }

      setOrders(data.orders || []);
      setLeads(data.leads || []);
      setUsers(data.users || []);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      carregarDados(token);
    }
  }, [token, apiUrl]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setProdMessage({ type: "", text: "" });
    setProdLoading(true);

    try {
      const res = await fetch(`${apiUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: prodName,
          category: prodCategory,
          price: Number(prodPrice),
          badge: prodTag,
          image: prodImage,
          description: prodDescription,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Erro ao cadastrar produto.");
      }

      setProdName("");
      setProdPrice("");
      setProdImage("");
      setProdDescription("");
      setProdTag("Novo");
      setProdMessage({ type: "success", text: "Produto cadastrado com sucesso na loja!" });
      await carregarDados(token);
    } catch (err) {
      setProdMessage({ type: "error", text: err.message });
    } finally {
      setProdLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Deseja remover o produto "${productName}" da loja?`)) return;

    try {
      const res = await fetch(`${apiUrl}/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Não foi possível remover o produto.");
      }

      setProducts((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      alert(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  const getStatusStyle = (status = "PENDENTE") => {
    const normalized = String(status).toUpperCase();
    if (normalized === "PAGO" || normalized === "APPROVED") {
      return { backgroundColor: "#DCFCE7", color: "#166534" };
    }
    if (normalized === "CANCELADO" || normalized === "CANCELLED") {
      return { backgroundColor: "#FEE2E2", color: "#991B1B" };
    }
    return { backgroundColor: "#FEF3C7", color: "#92400E" };
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 0.95rem",
    borderRadius: "12px",
    border: "1px solid #E4E4E7",
    fontSize: "0.92rem",
    backgroundColor: "#FFFFFF",
  };

  return (
    <div className="screen">
      <div className="home-header-bar">
        <div className="home-header content-wrap">
          <div className="brand" style={{ cursor: "pointer" }} onClick={onBack}>
            <Logo size={30} />
            <span className="brand-name">PixelTech • Painel Admin</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {token && (
              <>
                <button className="icon-btn" onClick={() => carregarDados(token)} title="Atualizar dados">
                  <RefreshCw size={18} />
                </button>
                <button
                  onClick={handleLogout}
                  title="Sair da conta"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    backgroundColor: "transparent",
                    border: "1px solid #E4E4E7",
                    borderRadius: "999px",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#1C1B22",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={15} />
                  <span>Sair</span>
                </button>
              </>
            )}
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                backgroundColor: "#1C1B22",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "999px",
                padding: "0.55rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={16} />
              Voltar à loja
            </button>
          </div>
        </div>
      </div>

      {/* TELA DE LOGIN CASO NÃO ESTEJA AUTENTICADO */}
      {!token ? (
        <div className="content-wrap" style={{ display: "flex", justifyContent: "center", paddingTop: "3rem", paddingBottom: "3rem" }}>
          <form
            onSubmit={handleLogin}
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#FFFFFF",
              padding: "2rem",
              borderRadius: "20px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                backgroundColor: "#635BFF",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <Lock size={22} />
            </div>

            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1C1B22", marginBottom: "0.35rem" }}>
              Acesso Administrativo
            </h2>
            <p style={{ fontSize: "0.88rem", color: "#71717A", marginBottom: "1.5rem" }}>
              Entre com o e-mail de administrador para consultar pedidos e gerenciar produtos.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", textAlign: "left" }}>
              <input
                type="email"
                required
                placeholder="E-mail do administrador"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                required
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            {loginError && (
              <p style={{ color: "#DC2626", fontSize: "0.85rem", marginTop: "0.85rem", textAlign: "left" }}>
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                width: "100%",
                marginTop: "1.25rem",
                backgroundColor: "#635BFF",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "999px",
                padding: "0.9rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loginLoading ? "not-allowed" : "pointer",
                opacity: loginLoading ? 0.75 : 1,
              }}
            >
              {loginLoading ? "Entrando..." : "Entrar no Painel"}
            </button>
          </form>
        </div>
      ) : (
        /* PAINEL ADMINISTRATIVO APÓS LOGIN */
        <div className="content-wrap" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <button
              className={`chip ${tab === "pedidos" ? "chip-active" : ""}`}
              onClick={() => setTab("pedidos")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Package size={16} />
              Pedidos ({orders.length})
            </button>
            <button
              className={`chip ${tab === "produtos" ? "chip-active" : ""}`}
              onClick={() => setTab("produtos")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <ShoppingBag size={16} />
              Produtos ({products.length})
            </button>
            <button
              className={`chip ${tab === "leads" ? "chip-active" : ""}`}
              onClick={() => setTab("leads")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <Users size={16} />
              Leads ({leads.length})
            </button>
            <button
              className={`chip ${tab === "clientes" ? "chip-active" : ""}`}
              onClick={() => setTab("clientes")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <UserCheck size={16} />
              Clientes ({users.length})
            </button>
          </div>

          {loading && (
            <p style={{ color: "#52525B" }}>
              Carregando registros... (se o servidor gratuito estava em repouso, pode levar até 40s na primeira vez)
            </p>
          )}
          {error && (
            <div style={{ backgroundColor: "#FEE2E2", color: "#991B1B", padding: "1rem", borderRadius: "12px", fontWeight: 500 }}>
              {error}
            </div>
          )}

          {/* ABA DE PEDIDOS */}
          {!loading && !error && tab === "pedidos" && (
            <div style={{ overflowX: "auto", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              {orders.length === 0 ? (
                <p style={{ padding: "1rem", color: "#71717A" }}>Nenhum pedido registrado ainda.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E4E7", color: "#71717A" }}>
                      <th style={{ padding: "0.75rem" }}>Pedido</th>
                      <th style={{ padding: "0.75rem" }}>Cliente</th>
                      <th style={{ padding: "0.75rem" }}>Itens</th>
                      <th style={{ padding: "0.75rem" }}>Total</th>
                      <th style={{ padding: "0.75rem" }}>Status</th>
                      <th style={{ padding: "0.75rem" }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const statusText = order.status || "PENDENTE";
                      const customerLabel =
                        order.user?.name || order.user?.email || order.customerName || order.userEmail || "Cliente";
                      return (
                        <tr key={order._id || order.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                          <td style={{ padding: "0.75rem", fontFamily: "monospace", fontWeight: 600 }}>
                            #{String(order._id || order.id).slice(-6).toUpperCase()}
                          </td>
                          <td style={{ padding: "0.75rem" }}>{customerLabel}</td>
                          <td style={{ padding: "0.75rem" }}>
                            {Array.isArray(order.items)
                              ? order.items.map((i) => `${i.qty}x ${i.name}`).join(", ")
                              : order.productName || "—"}
                          </td>
                          <td style={{ padding: "0.75rem", fontWeight: 600 }}>
                            {formatBRL(order.total || order.amount || 0)}
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <span
                              style={{
                                ...getStatusStyle(statusText),
                                padding: "0.25rem 0.65rem",
                                borderRadius: "999px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {statusText.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem", color: "#52525B" }}>
                            {formatDate(order.createdAt || order.date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ABA DE PRODUTOS (CADASTRO + LISTAGEM) */}
          {!loading && !error && tab === "produtos" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* Formulário para adicionar novo produto */}
              <form
                onSubmit={handleCreateProduct}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1C1B22", marginBottom: "0.25rem" }}>
                  Adicionar Novo Produto à Loja
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#71717A", marginBottom: "1.25rem" }}>
                  Os 80 produtos padrão continuam ativos. Novos itens cadastrados aqui aparecem automaticamente na vitrine.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                    gap: "0.9rem",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                      Nome do produto *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Teclado Mecânico RGB Pro"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                      Categoria *
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      style={inputStyle}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                      Preço (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      placeholder="Ex: 249.90"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                      Selo (opcional)
                    </label>
                    <select
                      value={prodTag}
                      onChange={(e) => setProdTag(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Novo">Novo</option>
                      <option value="Oferta">Oferta</option>
                      <option value="">Sem selo</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "0.9rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                    URL da Imagem (link direto da foto) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-..."
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginTop: "0.9rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                    Descrição do produto
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalhes técnicos, bateria, conexões..."
                    value={prodDescription}
                    onChange={(e) => setProdDescription(e.target.value)}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                {prodMessage.text && (
                  <p
                    style={{
                      marginTop: "0.85rem",
                      fontSize: "0.88rem",
                      fontWeight: 600,
                      color: prodMessage.type === "success" ? "#166534" : "#DC2626",
                    }}
                  >
                    {prodMessage.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={prodLoading}
                  style={{
                    marginTop: "1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    backgroundColor: "#635BFF",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.75rem 1.35rem",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    cursor: prodLoading ? "not-allowed" : "pointer",
                  }}
                >
                  <PlusCircle size={17} />
                  {prodLoading ? "Salvando..." : "Publicar Produto"}
                </button>
              </form>

              {/* Lista de produtos cadastrados pelo admin */}
              <div style={{ overflowX: "auto", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, padding: "0.5rem 0.75rem", color: "#1C1B22" }}>
                  Produtos Adicionados pelo Administrador ({products.length})
                </h4>
                {products.length === 0 ? (
                  <p style={{ padding: "0.75rem", color: "#71717A", fontSize: "0.9rem" }}>
                    Nenhum produto extra cadastrado ainda. Use o formulário acima para publicar o primeiro.
                  </p>
                ) : (
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #E4E4E7", color: "#71717A" }}>
                        <th style={{ padding: "0.75rem" }}>Foto</th>
                        <th style={{ padding: "0.75rem" }}>ID</th>
                        <th style={{ padding: "0.75rem" }}>Produto</th>
                        <th style={{ padding: "0.75rem" }}>Categoria</th>
                        <th style={{ padding: "0.75rem" }}>Preço</th>
                        <th style={{ padding: "0.75rem" }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => (
                        <tr key={prod.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                          <td style={{ padding: "0.75rem" }}>
                            <img
                              src={prod.image}
                              alt={prod.name}
                              style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "8px" }}
                            />
                          </td>
                          <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>#{prod.id}</td>
                          <td style={{ padding: "0.75rem", fontWeight: 600 }}>{prod.name}</td>
                          <td style={{ padding: "0.75rem" }}>{prod.category}</td>
                          <td style={{ padding: "0.75rem", fontWeight: 600 }}>{formatBRL(prod.price)}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              title="Remover produto"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                                backgroundColor: "#FEE2E2",
                                color: "#991B1B",
                                border: "none",
                                borderRadius: "8px",
                                padding: "0.4rem 0.65rem",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={14} />
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ABA DE LEADS */}
          {!loading && !error && tab === "leads" && (
            <div style={{ overflowX: "auto", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              {leads.length === 0 ? (
                <p style={{ padding: "1rem", color: "#71717A" }}>Nenhum lead cadastrado ainda.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E4E7", color: "#71717A" }}>
                      <th style={{ padding: "0.75rem" }}>Nome</th>
                      <th style={{ padding: "0.75rem" }}>E-mail</th>
                      <th style={{ padding: "0.75rem" }}>WhatsApp</th>
                      <th style={{ padding: "0.75rem" }}>Data de Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead._id || lead.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 600 }}>{lead.name || lead.nome || "—"}</td>
                        <td style={{ padding: "0.75rem" }}>{lead.email || "—"}</td>
                        <td style={{ padding: "0.75rem" }}>{lead.whatsapp || lead.phone || lead.telefone || "—"}</td>
                        <td style={{ padding: "0.75rem", color: "#52525B" }}>{formatDate(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ABA DE CLIENTES */}
          {!loading && !error && tab === "clientes" && (
            <div style={{ overflowX: "auto", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              {users.length === 0 ? (
                <p style={{ padding: "1rem", color: "#71717A" }}>Nenhum cliente registrado ainda.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #E4E4E7", color: "#71717A" }}>
                      <th style={{ padding: "0.75rem" }}>Nome</th>
                      <th style={{ padding: "0.75rem" }}>E-mail</th>
                      <th style={{ padding: "0.75rem" }}>Data de Cadastro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id || user.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 600 }}>{user.name || user.nome || "—"}</td>
                        <td style={{ padding: "0.75rem" }}>{user.email || "—"}</td>
                        <td style={{ padding: "0.75rem", color: "#52525B" }}>{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}