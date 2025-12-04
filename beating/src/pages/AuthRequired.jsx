import React from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

// Página mostrada cuando un usuario intenta acceder a una sección protegida sin iniciar sesión
export default function AuthRequired() {
  const navigate = useNavigate();

  const goToLogin = () => navigate("/login");
  const goToRegister = () => navigate("/register");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1e1626] text-center text-white px-4">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-6">
        Inicia sesión para continuar
      </h1>

      <p className="text-gray-300 max-w-md mb-10">
        Para crear una reseña y compartir tus emociones musicales, primero necesitas iniciar sesión o registrarte.
      </p>

      <div className="flex gap-6">
        <Button
          onClick={goToLogin}
          className="bg-gradient-to-r from-purple-400 to-blue-400 hover:opacity-90 text-white px-8 py-4 text-lg rounded-xl"
        >
          Iniciar Sesión
        </Button>

        <Button
          onClick={goToRegister}
          className="bg-gradient-to-r from-pink-400 to-purple-500 hover:opacity-90 text-white px-8 py-4 text-lg rounded-xl"
        >
          Registrarse
        </Button>
      </div>
    </main>
  );
}
