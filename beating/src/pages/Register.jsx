import { Button } from "./../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
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
  const [open, setOpen] = useState(true);
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
      setTimeout(() => navigate("/resenas"), 2000);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black border border-gray-800 p-8 w-[480px] max-w-[90vw] rounded-lg">
          <DialogClose 
            className="absolute right-4 top-4 text-gray-400"
            onClick={() => navigate('/')}  // Agrega esta línea
          >
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="space-y-4">
            <h2 className="text-2xl text-white font-semibold text-center">
              Registro de Usuario
            </h2>

            {mensaje && <p className="text-center text-purple-400">{mensaje}</p>}

            <div className="space-y-2">
              <label className="text-white block">Nombre de Usuario</label>
              <Input
                type="text"
                name="nombre_usuario"
                value={form.nombre_usuario}
                onChange={handleChange}
                className="bg-black border-gray-700 text-white h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white block">Correo Electrónico</label>
              <Input
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                className="bg-black border-gray-700 text-white h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-white block">Contraseña</label>
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
              onClick={handleSubmit}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
            >
              Registrarse
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}