import { Button } from "./../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { X } from "lucide-react";
import React from "react";

export default function Login() {
  // Background image would normally be imported, but using empty src as placeholder
 const backgroundImage = "https://videos.openai.com/vg-assets/assets%2Ftask_01jth9bnj3ff1s2213p9wmbmr3%2F1746484503_img_1.webp?st=2025-05-05T21%3A05%3A27Z&se=2025-05-11T22%3A05%3A27Z&sks=b&skt=2025-05-05T21%3A05%3A27Z&ske=2025-05-11T22%3A05%3A27Z&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skoid=8ebb0df1-a278-4e2e-9c20-f2d373479b3a&skv=2019-02-02&sv=2018-11-09&sr=b&sp=r&spr=https%2Chttp&sig=sJoaBeZyaGgGqKcBI7JN4VWKlJDPcP7j9g46hiH1F7Y%3D&az=oaivgprodscus"; // Replace with your actual image path

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Background image */}
      <img
        className="absolute w-full h-full object-cover"
        alt="Background"
        src={backgroundImage}
      />

      {/* Login dialog */}
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
              />
            </div>

            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12">
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
