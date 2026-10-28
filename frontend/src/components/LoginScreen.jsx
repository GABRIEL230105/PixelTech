import { useState } from "react";
import { ChevronLeft, Lock, Mail } from "lucide-react";
import Logo from "../components/Logo";

const API_URL = "http://localhost:5000/api";

export default function LoginScreen({ onBack, onLogin, onGoToRegister, externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível entrar.");
        return;
      }

      localStorage.setItem("pixeltech_token", data.token);
      localStorage.setItem("pixeltech_user", JSON.stringify({ name: data.name, email: data.email }));
      onLogin();
    } catch (err) {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

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

      <div className="login-wrap narrow-wrap">
        <div className="login-icon">
          <Lock size={22} color="white" />
        </div>
        <h2 className="login-title">Entre para finalizar sua compra</h2>
        <p className="login-sub">Precisamos confirmar quem é você antes de fechar o pedido.</p>

        <div className="field">
          <Mail size={16} className="field-icon" />
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <Lock size={16} className="field-icon" />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="form-feedback error">{error}</p>}
        {!error && externalError && <p className="form-feedback error">{externalError}</p>}

        <button
          className="primary-btn login-submit"
          onClick={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? "Entrando..." : "Entrar e continuar"}
        </button>

        <p className="login-alt">
          Ainda não tem conta? <span className="login-link" onClick={onGoToRegister}>Criar conta</span>
        </p>
      </div>
    </div>
  );
}