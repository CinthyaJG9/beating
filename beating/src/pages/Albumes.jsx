// src/pages/Albumes.jsx
import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import { useAuth } from "../pages/AuthContext";

export default function Albumes() {
  const { isAuthenticated } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");
  const [albumes, setAlbumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [albumSeleccionado, setAlbumSeleccionado] = useState(null);

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

  const obtenerColorSentimiento = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'text-green-400';
      case 'negativo': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-pink-300';
    }
  };

  const obtenerIconoSentimiento = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return '😊';
      case 'negativo': return '😔';
      case 'neutral': return '😐';
      default: return '💿';
    }
  };

  const formatearRating = (rating) => {
    return (rating * 5).toFixed(1);
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Fecha desconocida";
    const fecha = new Date(fechaString);
    return fecha.getFullYear();
  };

  const handleCrearResena = (album) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    if (album.existe_en_bd) {
      // Si el álbum ya existe en nuestra BD, redirigir directamente a reseñas
      navigate('/resenas', { 
        state: { 
          selectedAlbum: {
            id: album.id_album,
            name: album.titulo,
            artist: album.artista,
            image: album.imagen_url,
            year: formatearFecha(album.fecha_lanzamiento)
          }
        }
      });
    } else {
      // Para álbumes de Spotify que no están en nuestra BD
      navigate('/resenas', { 
        state: { 
          spotifyAlbum: {
            name: album.titulo,
            artist: album.artista,
            image: album.imagen_url,
            year: formatearFecha(album.fecha_lanzamiento),
            spotifyId: album.id_spotify
          }
        }
      });
    }
  };

  const handleVerDetalles = (album) => {
    setAlbumSeleccionado(album);
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
                        {/* Información principal MEJORADA */}
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
                            <div className="flex items-center gap-3 text-sm text-white/80 mb-2">
                              <span>📅 {formatearFecha(album.fecha_lanzamiento)}</span>
                              <span>•</span>
                              <span>🎵 {album.total_canciones || "?"} canciones</span>
                            </div>
                            {album.popularidad && (
                              <p className="text-orange-300 text-sm font-bold">
                                🔥 Popularidad: {album.popularidad}%
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {album.existe_en_bd ? (
                              <>
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <span className="text-yellow-400 text-2xl font-bold">
                                    {formatearRating(album.rating_promedio)}
                                  </span>
                                  <span className="text-yellow-400 text-xl">★</span>
                                </div>
                                <div className="text-white text-sm bg-green-600/40 px-3 py-2 rounded-full font-bold border border-green-400/60">
                                  {album.total_resenas} reseña{album.total_resenas !== 1 ? 's' : ''}
                                </div>
                              </>
                            ) : (
                              <div className="text-white text-sm bg-green-500/60 px-3 py-2 rounded-full font-bold border border-green-300">
                                ⚡ Spotify
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex gap-3 mt-6">
                          <Button
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg py-3 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                            onClick={() => handleCrearResena(album)}
                          >
                            <span className="mr-2">✍️</span>
                            Crear Reseña
                          </Button>
                          <Button
                            variant="outline"
                            className="border-blue-400 text-blue-400 hover:bg-blue-400/20 hover:border-blue-300 hover:text-blue-300 font-bold text-lg py-3 rounded-2xl transition-all duration-300 px-4 border-2"
                            onClick={() => handleVerDetalles(album)}
                          >
                            📖 Detalles
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
                  <p className="text-pink-200 text-xl mb-8 max-w-md mx-auto leading-relaxed font-semibold">
                    No encontramos resultados para "<span className="text-white font-bold">{search}</span>"
                  </p>
                  <div className="flex justify-center gap-5 flex-wrap">
                    <Button
                      className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg px-8 py-4 rounded-2xl font-bold border-2 border-white/30"
                      onClick={() => setSearch("")}
                    >
                      🔄 Intentar otra búsqueda
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado inicial MEJORADO */}
          {!loading && search.trim() === "" && (
            <div className="text-center py-24">
              <div className="text-9xl mb-10 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                💿
              </div>
              <h2 className="text-5xl font-bold text-white mb-8">
                Descubre Álbumes en <span className="bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">Beating</span>
              </h2>
              <p className="text-pink-200 text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-semibold">
                Explora miles de álbumes, lee reseñas de la comunidad musical 
                y comparte tus propias experiencias. Descubre obras completas y su impacto emocional.
              </p>
              <div className="flex justify-center gap-5 flex-wrap mb-16">
                <Button
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                  onClick={() => setSearch("the beatles")}
                >
                  🎸 The Beatles
                </Button>
                <Button
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                  onClick={() => setSearch("bad bunny")}
                >
                  🎤 Bad Bunny
                </Button>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/30 hover:border-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 border-2"
                  onClick={() => setSearch("pink floyd")}
                >
                  🌙 Pink Floyd
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">🔍</div>
                  <h4 className="text-white font-bold text-xl mb-4">Búsqueda de Álbumes</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Encuentra álbumes por título o artista</p>
                </div>
                <div className="bg-purple-500/10 rounded-2xl p-8 border-2 border-purple-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-purple-300">💬</div>
                  <h4 className="text-white font-bold text-xl mb-4">Reseñas Completas</h4>
                  <p className="text-purple-200 text-lg leading-relaxed font-semibold">Analiza obras musicales completas</p>
                </div>
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">⚡</div>
                  <h4 className="text-white font-bold text-xl mb-4">Spotify Integration</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Accede a toda la discografía en Spotify</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalles */}
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
              <div className="space-y-2 text-sm mb-4">
                <p className="opacity-80">
                  📅 Año: {formatearFecha(albumSeleccionado.fecha_lanzamiento)}
                </p>
                <p className="opacity-80">
                  🎵 Canciones: {albumSeleccionado.total_canciones || "Desconocido"}
                </p>
                {albumSeleccionado.popularidad && (
                  <p className="opacity-80">
                    🔥 Popularidad: {albumSeleccionado.popularidad}%
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={() => handleCrearResena(albumSeleccionado)}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl px-6 py-3"
                >
                  ✍️ Crear Reseña
                </Button>
                <Button
                  onClick={() => handleAbrirSpotify(albumSeleccionado)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl px-6 py-3"
                >
                  🎧 Spotify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </>
  );
}