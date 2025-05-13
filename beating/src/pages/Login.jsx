import { Button } from "./../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React, { useState } from "react";
import axios from "axios";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    axios
      .post("http://localhost:5000/login", {
        email,
        password,
      })
      .then((res) => {
        const token = res.data.token;
        localStorage.setItem("token", token);
        alert("Login exitoso");
      })
      .catch((err) => {
        alert("Correo o contraseña incorrectos");
      });
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

      <Dialog defaultOpen={true}>
        <DialogContent className="bg-black border border-gray-800 p-6 w-[480px] max-w-[90vw] rounded-lg">
          <DialogClose className="absolute right-4 top-4 text-gray-400">
            <X className="h-4 w-4" />
          </DialogClose>

          <div className="space-y-6">
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

            <div className="text-center text-white pt-2">
              ¿Aún no tienes cuenta?
            </div>

            <Button
              variant="outline"
              className="w-full border-purple-600 text-purple-600 hover:bg-purple-600/10 h-12"
            >
              Registrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
