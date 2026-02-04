import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "../style/modal.css"; // Import the modal.css file

export default function LoginModal({ logo, onSuccess, onError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setPending(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        onError?.(error.message);
        return;
      }

      setPassword("");
      onSuccess?.();
    } catch (err) {
      console.error(err);
      onError?.("Ошибка входа");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-header">
        <img src={logo} alt="Logo" className="logo__img" />
        <h1>Вход</h1>
      </div>

      <form
        onSubmit={handleLogin}
        className="login-form"
      >
        <div className="login-form-grid">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="search-input"
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="search-input"
            autoComplete="current-password"
          />

          <button className="btn-primary" type="submit" disabled={pending}>
            {pending ? "Входим..." : "Войти"}
          </button>

          <div className="login-info-text">
            Доступ только по общей учётке.
          </div>
        </div>
      </form>
    </div>
  );
}
