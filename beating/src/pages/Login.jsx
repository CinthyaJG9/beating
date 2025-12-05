import { Button } from "./../components/ui/button";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";
import { useAuth } from "../pages/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login, getPendingSelection } = useAuth();

  const isValidEmail = (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const isValidPassword = (value) => {
    return value.length >= 6;
  };

  const canSubmit = () => {
    return (
      isValidEmail(email.trim()) &&
      isValidPassword(password.trim()) &&
      !loading
    );
  };

  const handleLogin = async () => {
    if (!canSubmit()) {
      setError("Revisa tus credenciales.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const userData = {
          id: data.user?.id || data.user_id || data.id,
          username:
            data.user?.username ||
            data.user?.email ||
            data.username ||
            email.split("@")[0],
        };

        login(data.token, userData);

        const { selection, redirect } = getPendingSelection();
        if (selection) {
          navigate(redirect || "/resenas", { state: selection });
        } else {
          navigate("/resenas");
        }

        if (onClose) onClose();
      } else {
        setError(data.error || "Credenciales incorrectas.");
      }
    } catch (err) {
      console.error("❌ Error completo:", err);
      setError(
        "No se pudo conectar al servidor. Verifica que el backend esté corriendo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && canSubmit()) {
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative bg-gray-900/95 border border-gray-700 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <h2 className="text-2xl text-white font-bold text-center">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-3 rounded-lg border border-red-400/30">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-white block text-sm font-medium"
            >
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              className={`bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500 ${
                email && !isValidEmail(email) ? "border-red-500" : ""
              }`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyPress={handleKeyPress}
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-white block text-sm font-medium"
            >
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              className={`bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500 ${
                password && !isValidPassword(password) ? "border-red-500" : ""
              }`}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyPress={handleKeyPress}
              placeholder="••••••••"
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={!canSubmit()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Conectando...
              </div>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>

          <div className="text-center pt-4">
            <span className="text-gray-400 text-sm">
              ¿Aún no tienes cuenta?{" "}
              <button
                onClick={onSwitchToRegister}
                className="text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Regístrate aquí
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
