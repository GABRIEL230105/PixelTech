import { useState } from "react";
import { ChevronLeft, User, Mail, Lock } from "lucide-react";
import Logo from "../components/Logo";

const API_URL = "http://localhost:5000/api";

export default function RegisterScreen({ onBack, onGoToLogin, onRegistered }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome,
          email,
          password,
          address: { street, number, neighborhood, city, state, zip },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível criar a conta.");
        return;
      }

      localStorage.setItem("pixeltech_token", data.token);
      localStorage.setItem(
        "pixeltech_user",
        JSON.stringify({ name: data.name, email: data.email, address: data.address })
      );

      // Envia o código de verificação por e-mail e avança pra tela de código.
      // A conta já foi criada, então se o envio falhar a pessoa segue pra tela do código,
      // que avisa e oferece "Reenviar código" (não faz sentido mostrar erro de cadastro).
      let sendFailed = false;
      try {
        const otpRes = await fetch(`${API_URL}/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        sendFailed = !otpRes.ok;
      } catch (otpError) {
        sendFailed = true;
      }

      onRegistered(email, sendFailed);
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
          <User size={22} color="white" />
        </div>
        <h2 className="login-title">Crie sua conta</h2>
        <p className="login-sub">Leva menos de um minuto, e você já finaliza sua compra.</p>

        <div className="field">
          <User size={16} className="field-icon" />
          <input
            type="text"
            placeholder="Nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

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
            placeholder="Crie uma senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <p className="section-label">Endereço de entrega</p>

        <div className="field-row">
          <div className="field field-grow">
            <input
              type="text"
              placeholder="Rua"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </div>
          <div className="field field-small">
            <input
              type="text"
              placeholder="Nº"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <input
            type="text"
            placeholder="Bairro"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field field-grow">
            <input
              type="text"
              placeholder="Cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className="field field-small">
            <input
              type="text"
              placeholder="UF"
              maxLength={2}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="field">
          <input
            type="text"
            placeholder="CEP"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>

        {error && <p className="form-feedback error">{error}</p>}

        <button
          className="primary-btn login-submit"
          onClick={handleRegister}
          disabled={!nome || !email || !password || loading}
        >
          {loading ? "Criando..." : "Criar conta e continuar"}
        </button>

        <p className="login-alt">
          Já tem conta? <span className="login-link" onClick={onGoToLogin}>Entrar</span>
        </p>
      </div>
    </div>
  );
}