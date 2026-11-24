import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Package, Users, UserCheck, Lock, LogOut } from "lucide-react";
import Logo from "./Logo";
import { formatBRL } from "../utils/format";

const DEFAULT_API_URL = "https://pixeltech-obxa.onrender.com/api";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("pixeltech_token");
    localStorage.removeItem("pixeltech_user");
    setToken("");
    setOrders([]);
    setLeads([]);
    setUsers([]);
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

      if (res.status === 401) {
        handleLogout();
        setLoginError("Sessão expirada. Entre novamente para consultar.");
        return;
      }

      if (!res.ok) {
        throw new Error("Falha ao buscar registros no servidor.");
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setLeads(data.leads || []);
      setUsers(data.users || []);
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

  return (
    <div className="screen">
      <div className="home-header-bar">
        <div className="home-header content-wrap">
          <div className="brand" style={{ cursor: "pointer" }} onClick={onBack}>
            <Logo size={30} />
            <span className="brand-name">PixelTech • Consulta</span>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {token && (
              <>
                <button className="icon-btn" onClick={() => carregarDados(token)} title="Atualizar status">
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
                    cursor: "pointer"
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
                cursor: "pointer"
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
              textAlign: "center"
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
                margin: "0 auto 1rem"
              }}
            >
              <Lock size={22} />
            </div>

            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#1C1B22", marginBottom: "0.35rem" }}>
              Acessar Área de Consulta
            </h2>
            <p style={{ fontSize: "0.88rem", color: "#71717A", marginBottom: "1.5rem" }}>
              Faça login com sua conta para verificar o status dos pedidos e registros.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", textAlign: "left" }}>
              <input
                type="email"
                required
                placeholder="Seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid #E4E4E7",
                  fontSize: "0.95rem"
                }}
              />
              <input
                type="password"
                required
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid #E4E4E7",
                  fontSize: "0.95rem"
                }}
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
                opacity: loginLoading ? 0.75 : 1
              }}
            >
              {loginLoading ? "Entrando..." : "Entrar e verificar status"}
            </button>
          </form>
        </div>
      ) : (
        /* PAINEL DE CONSULTA APÓS LOGIN */
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
          {error && <p style={{ color: "#DC2626", fontWeight: 500 }}>{error}</p>}

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
                      return (
                        <tr key={order._id || order.id} style={{ borderBottom: "1px solid #F4F4F5" }}>
                          <td style={{ padding: "0.75rem", fontFamily: "monospace", fontWeight: 600 }}>
                            #{String(order._id || order.id).slice(-6).toUpperCase()}
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            {order.customerName || order.userEmail || order.email || "Cliente"}
                          </td>
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
                                fontWeight: 700
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