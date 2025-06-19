import React, { useState } from "react";
import axios from "axios";

export default function FormularioResena({ cancion }) {
  const [contenido, setContenido] = useState("");
  const [mensaje, setMensaje] = useState("");

  const enviar = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/resenas", {
        uri: cancion.uri,
        contenido,
        tipo: "cancion",
      });
      setMensaje("¡Reseña enviada con éxito!");
      setContenido("");
    } catch (err) {
      console.error("Error al enviar reseña:", err);
      setMensaje("Error al enviar reseña.");
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4">
      <h3 className="font-semibold">Escribe tu reseña para: {cancion.name}</h3>
      <textarea
        rows="4"
        value={contenido}
        onChange={(e) => setContenido(e.target.value)}
        placeholder="Tu opinión..."
        className="w-full p-3 border rounded"
        required
      />
      <button className="w-full bg-purple-600 text-white p-3 rounded hover:bg-purple-700">
        Enviar reseña
      </button>
      {mensaje && <p className="text-center text-purple-600">{mensaje}</p>}
    </form>
  );
}
