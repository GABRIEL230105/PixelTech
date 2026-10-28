import { useState } from "react";

const API_URL = "http://localhost:5000/api/leads";
const WHATSAPP_NUMBER = "5592900000000"; // troque pelo número real, com código do país (55) + DDD

export default function LeadForm() {
  const [form, setForm] = useState({ nome: "", email: "", telefone: "" });
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Falha ao enviar");

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const whatsappMessage = `Olá! Me chamo ${form.nome || ""} e acabei de me cadastrar no site.`;
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <section id="contato" className="lead-form-section">
      <h2>Deixe seu contato</h2>
      <p>Preencha o formulário e a gente entra em contato pelo WhatsApp.</p>

      <form className="lead-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="nome"
          placeholder="Seu nome"
          value={form.nome}
          onChange={handleChange}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Seu e-mail"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="tel"
          name="telefone"
          placeholder="Seu telefone"
          value={form.telefone}
          onChange={handleChange}
          required
        />

        <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
          {status === "loading" ? "Enviando..." : "Enviar"}
        </button>

        {status === "success" && (
          <div className="form-success">
            <p className="form-feedback success">Recebemos seu contato!</p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              Continuar no WhatsApp
            </a>
          </div>
        )}
        {status === "error" && (
          <p className="form-feedback error">Algo deu errado, tenta de novo.</p>
        )}
      </form>
    </section>
  );
}