// src/pages/Canciones.jsx
import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import { useAuth } from "../pages/AuthContext";

export default function Canciones() {
  const { isAuthenticated, savePendingSelection } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");
  const [canciones, setCanciones] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Buscar canciones cuando cambie el término de búsqueda
  useEffect(() => {
    const buscarCanciones = async () => {
      if (search.trim() === "") {
        setCanciones([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/canciones/buscar?q=${encodeURIComponent(search)}`);
        
        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error del servidor:", response.status, errorText);
          setCanciones([]);
          return;
        }

        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setCanciones(data);
        } else {
          const text = await response.text();
          console.error("Respuesta no es JSON:", text.substring(0, 200));
          setCanciones([]);
        }
      } catch (error) {
        console.error("Error de red:", error);
        setCanciones([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(buscarCanciones, 500);
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
      default: return '🎵';
    }
  };

  const formatearRating = (rating) => {
    return (rating * 5).toFixed(1);
  };

  const handleCrearResena = (cancion) => {
    if (!isAuthenticated) {
      // 👇 GUARDAR LA SELECCIÓN ANTES DE MOSTRAR LOGIN
      const selection = cancion.existe_en_bd 
        ? { 
            selectedSong: {
              id: cancion.id_cancion,
              name: cancion.titulo,
              artist: cancion.artista,
              album: cancion.album_titulo,
              image: cancion.imagen_url
            }
          }
        : { 
            spotifySong: {
              name: cancion.titulo,
              artist: cancion.artista,
              album: cancion.album_titulo,
              image: cancion.imagen_url,
              spotifyId: cancion.id_spotify
            }
          };
      
      savePendingSelection(selection, '/resenas');
      setShowLogin(true);
      return;
    }
    
    // 👇 CÓDIGO ORIGINAL (cuando ya está autenticado)
    if (cancion.existe_en_bd) {
      navigate('/resenas', { 
        state: { 
          selectedSong: {
            id: cancion.id_cancion,
            name: cancion.titulo,
            artist: cancion.artista,
            album: cancion.album_titulo,
            image: cancion.imagen_url
          }
        }
      });
    } else {
      navigate('/resenas', { 
        state: { 
          spotifySong: {
            name: cancion.titulo,
            artist: cancion.artista,
            album: cancion.album_titulo,
            image: cancion.imagen_url,
            spotifyId: cancion.id_spotify
          }
        }
      });
    }
  };

  const handleReproducir = (cancion) => {
    if (cancion.preview_url) {
      // Abrir preview de Spotify en nueva pestaña
      window.open(cancion.preview_url, '_blank');
    } else if (cancion.spotify_url) {
      // Si no hay preview, abrir la canción en Spotify
      window.open(cancion.spotify_url, '_blank');
    } else {
      alert("No hay preview disponible para esta canción");
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
                placeholder="Buscar canción, artista o álbum..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-6 py-5 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-pink-200 outline-none border-2 border-white/50 focus:border-white focus:bg-white/25 transition-all duration-300 text-xl shadow-lg font-semibold"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="text-white text-xl">🔍</span>
              </div>
            </div>
            <p className="text-pink-200 text-base mt-4 font-semibold">
              Escribe el nombre de una canción, artista o álbum para buscar
            </p>
          </div>

          {/* Estado de carga */}
          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-white mx-auto mb-6"></div>
              <p className="text-white text-xl font-bold">Buscando en Spotify...</p>
              <p className="text-pink-200 text-lg mt-3">Analizando millones de canciones</p>
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
                  <span className="text-white font-bold text-xl bg-pink-600/30 px-4 py-2 rounded-full">{canciones.length} canciones encontradas</span>
                  <span className="text-white text-2xl">•</span>
                  <span className="text-white font-semibold">"{search}"</span>
                </div>
              </div>
              
              {canciones.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {canciones.map((cancion) => (
                    <Card
                      key={cancion.id_spotify || cancion.id_cancion}
                      className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-2 border-white/30 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 hover:border-white/50"
                    >
                      <CardContent className="p-7">
                        {/* Información principal MEJORADA */}
                        <div className="flex gap-5 mb-5">
                          {cancion.imagen_url && (
                            <img 
                              src={cancion.imagen_url} 
                              alt={`Portada de ${cancion.album_titulo}`}
                              className="w-24 h-24 rounded-2xl object-cover shadow-xl flex-shrink-0 border-2 border-white/30"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-2xl font-bold text-white mb-2 leading-tight line-clamp-2">
                              {cancion.titulo}
                            </h3>
                            <p className="text-pink-300 font-bold text-lg mb-2 line-clamp-1">
                              {cancion.artista}
                            </p>
                            {cancion.album_titulo && (
                              <p className="text-pink-400 text-base font-bold line-clamp-1 bg-pink-500/30 px-3 py-1 rounded-full">
                                💿 {cancion.album_titulo}
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            {cancion.existe_en_bd ? (
                              <>
                                <div className="flex items-center gap-2 justify-end mb-2">
                                  <span className="text-yellow-400 text-2xl font-bold">
                                    {formatearRating(cancion.rating_promedio)}
                                  </span>
                                  <span className="text-yellow-400 text-xl">★</span>
                                </div>
                                <div className="text-white text-sm bg-green-600/40 px-3 py-2 rounded-full font-bold border border-green-400/60">
                                  {cancion.total_resenas} reseña{cancion.total_resenas !== 1 ? 's' : ''}
                                </div>
                              </>
                            ) : (
                              <div className="text-white text-sm bg-green-500/60 px-3 py-2 rounded-full font-bold border border-green-300">
                                ⚡ Spotify
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Palabras clave */}
                        {cancion.palabras_clave && cancion.palabras_clave.length > 0 && (
                          <div className="mb-5">
                            <p className="text-white text-base font-bold mb-3">🎯 Temas destacados:</p>
                            <div className="flex flex-wrap gap-2">
                              {cancion.palabras_clave.map((palabra, index) => (
                                <span
                                  key={index}
                                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full text-sm text-white font-bold backdrop-blur-sm border border-white/30"
                                >
                                  #{palabra}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {cancion.reseñas_recientes && cancion.reseñas_recientes.length > 0 ? (
                          <div className="mb-5">
                            <p className="text-white text-base font-bold mb-4">💬 Reseñas recientes:</p>
                            <div className="space-y-4">
                              {cancion.reseñas_recientes.slice(0, 2).map((resena, index) => (
                                <div key={index} className="bg-white/20 rounded-xl p-4 border-2 border-white/30">
                                  <div className="flex items-center gap-3 mb-3">
                                    <span className={`text-lg ${obtenerColorSentimiento(resena.sentimiento)}`}>
                                      {obtenerIconoSentimiento(resena.sentimiento)}
                                    </span>
                                    <span className="text-white font-bold text-base">{resena.usuario}</span>
                                    {resena.puntuacion && (
                                      <span className="text-yellow-400 text-base font-bold ml-auto">
                                        {formatearRating(resena.puntuacion)}★
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-white text-base leading-relaxed line-clamp-3 font-semibold">
                                    "{resena.texto.length > 120 
                                      ? resena.texto.substring(0, 120) + '...' 
                                      : resena.texto}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mb-5 text-center py-6 border-2 border-dashed border-yellow-400/60 rounded-xl bg-yellow-500/20">
                            <div className="text-4xl mb-4 text-yellow-300">✨</div>
                            <p className="text-white font-bold text-xl mb-3">
                              ¡Sé el primero en reseñar!
                            </p>
                            <p className="text-yellow-200 text-lg font-semibold">
                              Comparte tu experiencia con esta canción
                            </p>
                          </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-4 mt-7">
                          <Button
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-lg py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                            onClick={() => handleCrearResena(cancion)}
                          >
                            <span className="mr-3 text-xl">✍️</span>
                            Crear Reseña
                          </Button>
                          <Button
                            variant="outline"
                            className="border-green-400 text-green-400 hover:bg-green-400/20 hover:border-green-300 hover:text-green-300 font-bold text-lg py-4 rounded-2xl transition-all duration-300 px-6 border-2"
                            onClick={() => handleReproducir(cancion)}
                          >
                            <span className="mr-3 text-xl">▶️</span>
                            Reproducir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-gradient-to-br from-pink-500/10 to-purple-600/10 rounded-3xl border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-9xl mb-8 text-pink-300">🎵</div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    No se encontraron canciones
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
                    <Button
                      variant="outline"
                      className="border-white text-white text-lg px-8 py-4 rounded-2xl font-bold border-2"
                      onClick={() => setSearch("bad bunny")}
                    >
                      🎤 Ejemplo: Bad Bunny
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
                🎧
              </div>
              <h2 className="text-5xl font-bold text-white mb-8">
                Descubre Música en <span className="bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">Beating</span>
              </h2>
              <p className="text-pink-200 text-xl max-w-3xl mx-auto mb-12 leading-relaxed font-semibold">
                Explora millones de canciones, lee reseñas de la comunidad musical 
                y comparte tus propias experiencias. Encuentra tu próxima canción favorita.
              </p>
              <div className="flex justify-center gap-5 flex-wrap mb-16">
                <Button
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                  onClick={() => setSearch("rock")}
                >
                  🎸 Rock Clásico
                </Button>
                <Button
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl border-2 border-white/30"
                  onClick={() => setSearch("pop")}
                >
                  🎤 Pop Moderno
                </Button>
                <Button
                  variant="outline"
                  className="border-white text-white hover:bg-white/30 hover:border-white text-xl px-10 py-5 rounded-2xl font-bold transition-all duration-300 border-2"
                  onClick={() => setSearch("jazz")}
                >
                  🎷 Jazz Atemporal
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">🔍</div>
                  <h4 className="text-white font-bold text-xl mb-4">Búsqueda Inteligente</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Encuentra canciones por título, artista o álbum</p>
                </div>
                <div className="bg-purple-500/10 rounded-2xl p-8 border-2 border-purple-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-purple-300">💬</div>
                  <h4 className="text-white font-bold text-xl mb-4">Reseñas Reales</h4>
                  <p className="text-purple-200 text-lg leading-relaxed font-semibold">Lee opiniones de la comunidad musical</p>
                </div>
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">⚡</div>
                  <h4 className="text-white font-bold text-xl mb-4">Spotify Integration</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Accede a millones de canciones en tiempo real</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showLogin && <Login onClose={() => setShowLogin(false)} onSwitchToRegister={() => {}} />}
    </>
  );
}