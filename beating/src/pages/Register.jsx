import { Button } from "./../components/ui/button";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";

export default function Register({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    nombre_usuario: "",
    correo: "",
    contrasena: "",
  });

  const [mensaje, setMensaje] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await axios.post("http://localhost:5000/register", form);
      setMensaje("✅ Registro exitoso! Redirigiendo...");
      setTimeout(() => {
        onClose();
        window.location.href = '/resenas';
      }, 1500);
    } catch (err) {
      if (err.response) {
        setMensaje("❌ Error: " + err.response.data.error);
      } else {
        setMensaje("❌ Error en el servidor.");
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
            Crear Cuenta
          </h2>

          {/* Mensaje de estado */}
          {mensaje && (
            <div className={`text-sm text-center py-2 px-3 rounded-lg ${
              mensaje.includes('✅') 
                ? 'text-green-400 bg-green-400/10' 
                : 'text-red-400 bg-red-400/10'
            }`}>
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">
                Nombre de Usuario
              </label>
              <Input
                type="text"
                name="nombre_usuario"
                value={form.nombre_usuario}
                onChange={handleChange}
                className="bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500"
                placeholder="Tu nombre de usuario"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">
                Correo Electrónico
              </label>
              <Input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                className="bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-white block text-sm font-medium">
                Contraseña
              </label>
              <Input
                type="password"
                name="contrasena"
                value={form.contrasena}
                onChange={handleChange}
                className="bg-gray-800 border-gray-600 text-white h-12 focus:border-purple-500"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-12 font-semibold text-lg"
            >
              Crear Cuenta
            </Button>
          </form>

          <div className="text-center pt-4">
            <span className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-purple-400 hover:text-purple-300 font-medium underline"
              >
                Inicia sesión aquí
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}