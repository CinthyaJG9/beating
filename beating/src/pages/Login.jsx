import { Button } from "./../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // Para redirigir

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

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
      navigate('/inicio');
    }
  } catch (error) {
    if (error.response) {
      setError(error.response.data.error || 'Error en las credenciales');
    } else {
      setError('No se pudo conectar al servidor');
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
        <DialogContent className="bg-black border border-gray-800 p-6 w-[480px] max-w-[90vw] rounded-lg">
          <DialogClose className="absolute right-4 top-4 text-gray-400">
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="space-y-6">
            <h2 className="text-2xl text-white font-semibold text-center">
              Iniciar Sesión
            </h2>

            {/* 🔴 Muestra errores aquí */}
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-white block">
                Correo Electrónico:
              </label>
              <Input
                id="email"
                type="email"
                className="bg-black border-gray-700 text-white h-12"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-white block">
                Contraseña:
              </label>
              <Input
                id="password"
                type="password"
                className="bg-black border-gray-700 text-white h-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              onClick={handleLogin}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
            >
              Iniciar Sesión
            </Button>

            <div className="text-center text-white pt-2 text-sm">
              ¿Aún no tienes cuenta?
            </div>

            {/* 🔁 Redirige a una ruta de registro */}
            <Button
              variant="outline"
              className="w-full border-purple-600 text-purple-600 hover:bg-purple-600/10 h-12"
              onClick={() => {
                setOpen(false);         
                navigate("/register"); 
              }}
            >
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
