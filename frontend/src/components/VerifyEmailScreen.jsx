import { useState } from "react";
import { ChevronLeft, MailCheck } from "lucide-react";
import Logo from "./Logo";

const API_URL = "https://pixeltech-obxa.onrender.com/api";

export default function VerifyEmailScreen({ email, onBack, onVerified, externalError, initialError }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError || "");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // Depois que o código é aceito, o backend apaga ele. Por isso, daqui pra frente
  // o botão só repete a etapa do pagamento e não tenta validar o código de novo.
  const [verified, setVerified] = useState(false);

  const handleVerify = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (!verified) {
        const res = await fetch(`${API_URL}/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Não foi possível verificar o código.");
          return;
        }

        setVerified(true);
      }

      // Cria o pedido e abre o checkout. Se falhar, o motivo chega em externalError.
      await onVerified();
    } catch (err) {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");
    setResending(true);
    try {
      const res = await fetch(`${API_URL}/otp/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Não foi possível reenviar o código.");
        return;
      }

      setInfo("Enviamos um novo código para o seu e-mail.");
    } catch (err) {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setResending(false);
    }
  };

  const paymentFailed = verified && !loading && externalError;

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
          <MailCheck size={22} color="white" />
        </div>
        <h2 className="login-title">Confirme seu e-mail</h2>
        <p className="login-sub">
          Enviamos um código de 6 dígitos para <strong>{email}</strong>. Ele vale por 10 minutos.
        </p>

        <div className="field">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            disabled={verified}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{ letterSpacing: "6px", textAlign: "center", fontSize: "18px" }}
          />
        </div>

        {error && <p className="form-feedback error">{error}</p>}
        {info && <p className="form-feedback success">{info}</p>}
        {verified && !paymentFailed && (
          <p className="form-feedback success">E-mail verificado! Preparando seu pagamento...</p>
        )}
        {paymentFailed && (
          <>
            <p className="form-feedback success">E-mail verificado com sucesso.</p>
            <p className="form-feedback error">Não deu para abrir o pagamento: {externalError}</p>
          </>
        )}

        <button
          className="primary-btn login-submit"
          onClick={handleVerify}
          disabled={(!verified && code.length !== 6) || loading}
        >
          {loading
            ? verified
              ? "Gerando pagamento..."
              : "Verificando..."
            : verified
            ? "Tentar pagar novamente"
            : "Confirmar código"}
        </button>

        {!verified && (
          <p className="login-alt">
            Não recebeu?{" "}
            <span className="login-link" onClick={resending ? undefined : handleResend}>
              {resending ? "Enviando..." : "Reenviar código"}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}