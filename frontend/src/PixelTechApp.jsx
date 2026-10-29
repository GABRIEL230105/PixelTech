import { useState } from "react";
import "./styles/pixeltech.css";
import HomeScreen from "./components/HomeScreen";
import CartScreen from "./components/CartScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";
import VerifyEmailScreen from "./components/VerifyEmailScreen";
import ConfirmScreen from "./components/ConfirmScreen";
import WhatsAppButton from "./components/WhatsAppButton";

const API_URL = "https://pixeltech-obxa.onrender.com/api";

export default function PixelTechApp() {
  const [screen, setScreen] = useState("home"); // home | cart | login | register | verify | confirm
  const [cart, setCart] = useState([]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  // Token vencido ou conta que não existe mais: descarta o login e volta pra tela de entrar
  const sessionExpired = (message) => {
    localStorage.removeItem("pixeltech_token");
    localStorage.removeItem("pixeltech_user");
    setPaymentError(message || "Sessão expirada, faça login novamente.");
    setScreen("login");
  };

  // Cria o pedido no banco e redireciona pro checkout do Mercado Pago
  const goToPayment = async () => {
    setPaymentError("");
    const token = localStorage.getItem("pixeltech_token");

    if (!token) {
      setPaymentError("Sessão expirada, faça login novamente.");
      setScreen("login");
      return;
    }

    // O carrinho fica só na memória da página: se ela foi recarregada, ele esvazia
    if (cart.length === 0) {
      setPaymentError("Seu carrinho está vazio. Volte à loja e adicione um produto antes de pagar.");
      return;
    }

    try {
      // Só mandamos o id e a quantidade: nomes, preços e total são calculados no servidor,
      // e o endereço de entrega é o que está salvo na conta
      const orderRes = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.id, qty: i.qty })),
        }),
      });
      const order = await orderRes.json();

      if (orderRes.status === 401) return sessionExpired(order.error);

      if (!orderRes.ok) {
        setPaymentError(order.error || "Não foi possível criar o pedido.");
        return;
      }

      const prefRes = await fetch(`${API_URL}/payments/create-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: order._id }),
      });
      const pref = await prefRes.json();

      if (prefRes.status === 401) return sessionExpired(pref.error);

      if (!prefRes.ok) {
        const base = pref.error || "Não foi possível gerar o pagamento.";
        setPaymentError(pref.details ? `${base} (${pref.details})` : base);
        return;
      }

      // Manda o usuário pro checkout do Mercado Pago
      window.location.href = pref.init_point;
    } catch (err) {
      setPaymentError("Não foi possível conectar ao servidor.");
    }
  };

  return (
    <div className="site">
      {screen === "home" && (
        <HomeScreen cartCount={cartCount} onOpenCart={() => setScreen("cart")} onAdd={addToCart} />
      )}
      {screen === "cart" && (
        <CartScreen
          items={cart}
          onBack={() => setScreen("home")}
          onRemove={removeFromCart}
          onCheckout={() => setScreen("login")}
        />
      )}
      {screen === "login" && (
        <LoginScreen
          onBack={() => setScreen("cart")}
          onLogin={goToPayment}
          onGoToRegister={() => setScreen("register")}
          externalError={paymentError}
        />
      )}
      {screen === "register" && (
        <RegisterScreen
          onBack={() => setScreen("login")}
          onGoToLogin={() => setScreen("login")}
          onRegistered={(email, sendFailed) => {
            setPendingEmail(email);
            setVerifyNotice(
              sendFailed
                ? "Sua conta foi criada, mas não conseguimos enviar o código agora. Toque em “Reenviar código”."
                : ""
            );
            setScreen("verify");
          }}
        />
      )}
      {screen === "verify" && (
        <VerifyEmailScreen
          email={pendingEmail}
          onBack={() => setScreen("register")}
          onVerified={goToPayment}
          externalError={paymentError}
          initialError={verifyNotice}
        />
      )}
      {screen === "confirm" && (
        <ConfirmScreen
          onBackToHome={() => {
            setCart([]);
            setScreen("home");
          }}
        />
      )}
      <WhatsAppButton />
    </div>
  );
}