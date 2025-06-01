import React, { useState } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";

export default function Resenas() {
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState(""); 
  const [mensaje, setMensaje] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipo) {
      setMensaje("Debes seleccionar si es canción o álbum.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/resenas", {
        contenido,
        tipo,
      });

      setMensaje("Hemos recibido tu reseña, gracias por colaborar con Beating!");
      setContenido("");
      setTipo("");
    } catch (error) {
      console.error(error);
      setMensaje("Ups! Parece que no nos ha llegado tu reseña, intenta de nuevo!");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-lg w-full max-w-lg space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Escribe tu reseña</h2>

        <textarea
          rows="5"
          value={contenido}
          onChange={(e) => setContenido(e.target.value)}
          placeholder="¿Qué quieres decir?"
          className="w-full p-4 bg-black border border-gray-700 text-white rounded"
          required
        />

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tipo === "cancion"}
              onChange={() => setTipo("cancion")}
              className="form-checkbox text-purple-600"
            />
            Canción
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={tipo === "album"}
              onChange={() => setTipo("album")}
              className="form-checkbox text-purple-600"
            />
            Álbum
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Enviar reseña
        </Button>

        {mensaje && (
          <div className="text-center text-purple-400 mt-4">{mensaje}</div>
        )}
      </form>
    </div>
  );
}
