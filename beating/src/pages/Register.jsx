import { Button } from "./../components/ui/button";
import { Input } from "../components/ui/input";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    nombre_usuario: "",
    correo: "",
    contrasena: "",
  });

  const [mensaje, setMensaje] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");
    try {
      const res = await axios.post("http://localhost:5000/register", form);
      setMensaje("Registro exitoso, comienza a navegar por Beating!. ID: " + res.data.user_id);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err.response) {
        setMensaje("Error: " + err.response.data.error);
      } else {
        setMensaje("Error en el servidor.");
      }
    }
  };

  const backgroundImage =
    "https://videos.openai.com/vg-assets/assets%2Ftask_01jth9bnj3ff1s2213p9wmbmr3%2F1746484503_img_1.webp";

  return (
    <div className="relative w-full h-screen bg-black">
      <img
        className="absolute w-full h-full object-cover"
        alt="Background"
        src={backgroundImage}
      />

      <div className="relative z-10 flex items-center justify-center h-full">
        <form
          onSubmit={handleSubmit}
          className="bg-black border border-gray-800 p-8 w-[480px] max-w-[90vw] rounded-lg space-y-4"
        >
          <h2 className="text-2xl text-white font-semibold text-center">
            Registro de Usuario
          </h2>

          {mensaje && <p className="text-center text-purple-400">{mensaje}</p>}

          <div>
            <label className="text-white block mb-1">Nombre de Usuario</label>
            <Input
              type="text"
              name="nombre_usuario"
              value={form.nombre_usuario}
              onChange={handleChange}
              className="bg-black border-gray-700 text-white h-12"
            />
          </div>

          <div>
            <label className="text-white block mb-1">Correo Electrónico</label>
            <Input
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              className="bg-black border-gray-700 text-white h-12"
            />
          </div>

          <div>
            <label className="text-white block mb-1">Contraseña</label>
            <Input
              type="password"
              name="contrasena"
              value={form.contrasena}
              onChange={handleChange}
              className="bg-black border-gray-700 text-white h-12"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
          >
            Registrarse
          </Button>
        </form>
      </div>
    </div>
  );
}
