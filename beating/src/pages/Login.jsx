import { Button } from "./../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";

export default function Login({ onClose, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:5000/login', {
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user_id', response.data.user_id);
        localStorage.setItem('username', response.data.username);
        onClose(); // Cierra el modal
        window.location.href = '/resenas'; // Redirige
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.error || 'Error en las credenciales');
      } else {
        setError('No se pudo conectar al servidor');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo borroso con overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900/95 border border-gray-700 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
        {/* Botón cerrar */}
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

          {/* Mensaje de error */}
          {error && (
            <div className="text-red-400 text-sm text-center bg-red-400/10 py-2 px-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-white block text-sm font-medium">
              Correo Electrónico
            </label>
            <Input
              id="email"
              type="email"
              className="bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-white block text-sm font-medium">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              className="bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            onClick={handleLogin}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold text-lg"
          >
            Iniciar Sesión
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