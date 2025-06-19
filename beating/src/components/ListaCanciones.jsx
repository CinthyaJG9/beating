import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ListaCanciones({ artista, onSelect }) {
  const [canciones, setCanciones] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/canciones-artista?id=${artista.id}`);
        setCanciones(res.data.tracks || []);
      } catch (err) {
        console.error("Error al obtener canciones:", err);
      }
    };
    cargar();
  }, [artista]);

  return (
    <div>
      <h3 className="font-semibold mb-2">Canciones de {artista.name}</h3>
      <ul className="border rounded max-h-60 overflow-y-auto">
        {canciones.map((c) => (
          <li
            key={c.uri}
            className="p-2 hover:bg-purple-100 cursor-pointer"
            onClick={() => onSelect(c)}
          >
            {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
