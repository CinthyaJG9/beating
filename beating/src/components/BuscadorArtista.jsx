import React, { useState } from "react";
import axios from "axios";

export default function BuscadorArtista({ onSelect }) {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  const buscar = async (e) => {
    const query = e.target.value;
    setBusqueda(query);
    if (!query) return setResultados([]);

    try {
      const res = await axios.get(`http://localhost:5000/buscar-artista?q=${encodeURIComponent(query)}`);
      setResultados(res.data.artists || []);
    } catch (err) {
      console.error("Error al buscar artista:", err);
    }
  };

  return (
    <div>
      <label className="block mb-1 font-semibold">Buscar artista</label>
      <input
        type="text"
        value={busqueda}
        onChange={buscar}
        placeholder="Ej: Taylor Swift"
        className="w-full p-3 border rounded"
      />
      {resultados.length > 0 && (
        <ul className="mt-2 border rounded max-h-60 overflow-y-auto">
          {resultados.map((artista) => (
            <li
              key={artista.id}
              className="p-2 hover:bg-purple-100 cursor-pointer"
              onClick={() => {
                onSelect(artista);
                setResultados([]);
              }}
            >
              {artista.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
