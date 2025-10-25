// src/pages/Albumes.jsx
import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import Login from "./Login";

export default function Albumes() {
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");
  const [albumes, setAlbumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [albumSeleccionado, setAlbumSeleccionado] = useState(null); // 👈 Para mostrar detalles
  const navigate = useNavigate();

  useEffect(() => {
    const buscarAlbumes = async () => {
      if (search.trim() === "") {
        setAlbumes([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/albumes/buscar?q=${encodeURIComponent(search)}`
        );

        if (!response.ok) {
          console.error("Error en la respuesta:", response.status);
          setAlbumes([]);
          return;
        }

        const data = await response.json();
        setAlbumes(data);
      } catch (error) {
        console.error("Error de red:", error);
        setAlbumes([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(buscarAlbumes, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  const formatearRating = (rating) => (rating * 5).toFixed(1);

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Fecha desconocida";
    const fecha = new Date(fechaString);
    return fecha.getFullYear();
  };

  const handleCrearResena = async (album) => {
    if (!userLoggedIn) {
      setShowLogin(true);
      return;
    }

    try {
      let albumId = album.id_album;

      if (!album.existe_en_bd) {
        const response = await fetch(
          "http://localhost:5000/api/albumes/agregar-desde-spotify",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              titulo: album.titulo,
              artista: album.artista,
              fecha_lanzamiento: album.fecha_lanzamiento,
            }),
          }
        );

        const data = await response.json();
        if (data.id_album) {
          albumId = data.id_album;
        } else {
          throw new Error("No se pudo agregar el álbum");
        }
      }

      navigate(`/crear-resena/album/${albumId}`);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al crear reseña: " + error.message);
    }
  };

  const handleVerDetalles = (album) => {
    setAlbumSeleccionado(album); // 👈 Muestra el modal
  };

  const handleCerrarModal = () => {
    setAlbumSeleccionado(null);
  };

  const handleAbrirSpotify = (album) => {
    if (album.spotify_url) {
      window.open(album.spotify_url, "_blank");
    } else {
      alert("No hay enlace disponible para este álbum");
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-[#1a1124] to-[#2a1a3a] text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <header className="flex justify-between items-center mb-12">
            <h1
              onClick={() => navigate("/")}
              className="cursor-pointer text-5xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent hover:from-purple-400 hover:to-pink-400 transition-all duration-300"
            >
              Beating
            </h1>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/20 hover:border-white transition-colors text-lg px-6 py-3"
              onClick={() => navigate("/")}
            >
              ← Volver al Inicio
            </Button>
          </header>

          {/* Buscador */}
          <div className="mb-12 text-center">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Buscar álbum o artista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-6 py-5 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-pink-200 outline-none border-2 border-white/50 focus:border-white focus:bg-white/25 transition-all duration-300 text-xl shadow-lg font-semibold"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="text-white text-xl">🔍</span>
              </div>
            </div>
            <p className="text-pink-200 text-base mt-4 font-semibold">
              Busca álbumes y descubre reseñas de otros usuarios
            </p>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-white mx-auto mb-6"></div>
              <p className="text-white text-xl font-bold">Buscando en Spotify...</p>
              <p className="text-pink-200 text-lg mt-3">Analizando miles de álbumes</p>
            </div>
          )}

          {/* Resultados */}
          {!loading && search.trim() !== "" && (
            <div className="mb-8">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-white mb-4">
                  Resultados de búsqueda
                </h2>
                <div className="flex justify-center items-center gap-4 text-pink-200 text-lg">
                  <span className="text-white font-bold text-xl bg-pink-600/30 px-4 py-2 rounded-full">
                    {albumes.length} álbum{albumes.length !== 1 ? "es" : ""} encontrados
                  </span>
                  <span className="text-white text-2xl">•</span>
                  <span className="text-white font-semibold">"{search}"</span>
                </div>
              </div>

              {albumes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {albumes.map((album) => (
                    <Card
                      key={album.id_spotify || album.id_album}
                      className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 hover:border-white/50"
                    >
                      <CardContent className="p-7">
                        <div className="flex gap-5 mb-5">
                          {album.imagen_url && (
                            <img
                              src={album.imagen_url}
                              alt={`Portada del álbum ${album.titulo}`}
                              className="w-28 h-28 rounded-2xl object-cover shadow-xl flex-shrink-0 border-2 border-white/30"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-bold text-white mb-2 leading-tight line-clamp-2">
                              {album.titulo}
                            </h3>
                            <p className="text-pink-300 font-bold text-lg mb-2 line-clamp-1">
                              {album.artista}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-white/80">
                              <span>{formatearFecha(album.fecha_lanzamiento)}</span>
                              <span>•</span>
                              <span>{album.total_canciones || "?"} canciones</span>
                              <span>•</span>
                              <span>
                                {album.popularidad
                                  ? `🔥 ${album.popularidad}%`
                                  : "Popular"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <Button
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg py-3 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                            onClick={() => handleCrearResena(album)}
                          >
                            ✍️ Reseña
                          </Button>
                          <Button
                            variant="outline"
                            className="border-blue-400 text-blue-400 hover:bg-blue-400/20 hover:border-blue-300 hover:text-blue-300 font-bold text-lg py-3 rounded-2xl transition-all duration-300 px-4 border-2"
                            onClick={() => handleVerDetalles(album)}
                          >
                            📖 Detalles
                          </Button>
                          <Button
                            variant="outline"
                            className="border-green-400 text-green-400 hover:bg-green-400/20 hover:border-green-300 hover:text-green-300 font-bold text-lg py-3 rounded-2xl transition-all duration-300 px-4 border-2"
                            onClick={() => handleAbrirSpotify(album)}
                          >
                            🎧 Spotify
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-3xl border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-9xl mb-8 text-pink-300">💿</div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    No se encontraron álbumes
                  </h3>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 🩷 Modal de Detalles */}
      {albumSeleccionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-purple-700/40 to-pink-700/40 border-2 border-white/30 rounded-3xl p-8 max-w-lg w-[90%] text-white shadow-2xl animate-fadeIn relative">
            <button
              onClick={handleCerrarModal}
              className="absolute top-3 right-4 text-white text-2xl hover:text-pink-300"
            >
              ✖
            </button>
            <div className="flex flex-col items-center text-center">
              {albumSeleccionado.imagen_url && (
                <img
                  src={albumSeleccionado.imagen_url}
                  alt={albumSeleccionado.titulo}
                  className="w-40 h-40 rounded-2xl object-cover border-2 border-white/30 mb-5 shadow-xl"
                />
              )}
              <h2 className="text-3xl font-bold mb-3">
                {albumSeleccionado.titulo}
              </h2>
              <p className="text-pink-300 text-lg font-semibold mb-4">
                {albumSeleccionado.artista}
              </p>
              <p className="text-sm mb-2 opacity-80">
                Año: {formatearFecha(albumSeleccionado.fecha_lanzamiento)}
              </p>
              <p className="text-sm mb-2 opacity-80">
                Canciones: {albumSeleccionado.total_canciones || "Desconocido"}
              </p>
              {albumSeleccionado.generos && albumSeleccionado.generos.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-3">
                  {albumSeleccionado.generos.slice(0, 5).map((g, i) => (
                    <span
                      key={i}
                      className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full border border-purple-400/30"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <Button
                onClick={() => handleAbrirSpotify(albumSeleccionado)}
                className="mt-6 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl px-6 py-3"
              >
                🎧 Escuchar en Spotify
              </Button>
            </div>
          </div>
        </div>
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  );
}
