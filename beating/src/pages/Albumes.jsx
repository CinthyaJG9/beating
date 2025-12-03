import React, { useState, useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import Login from "./Login";
import { useAuth } from "../pages/AuthContext";

export default function Albumes() {
  const { isAuthenticated, savePendingSelection, user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [search, setSearch] = useState("");
  const [albumes, setAlbumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [albumSeleccionado, setAlbumSeleccionado] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searchAttempts, setSearchAttempts] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const searchTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Lista de términos prohibidos o inapropiados
  const blockedTerms = [
    'porn', 'xxx', 'sex', 'adult', 'violence', 'gore', 'drugs', 
    'hate', 'racist', 'nazi', 'terrorist', 'kill', 'murder'
  ];

  // Validar término de búsqueda
  const validateSearchTerm = (term) => {
    const lowerTerm = term.toLowerCase();
    
    // Validar longitud
    if (term.trim().length < 2) {
      setSearchError("La búsqueda debe tener al menos 2 caracteres");
      return false;
    }

    // Validar caracteres permitidos (solo letras, números, espacios y algunos símbolos)
    const validPattern = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑ.,!?¿¡\-&']+$/;
    if (!validPattern.test(term)) {
      setSearchError("Solo se permiten letras, números y espacios");
      return false;
    }

    // Validar términos bloqueados
    for (const blockedTerm of blockedTerms) {
      if (lowerTerm.includes(blockedTerm)) {
        setSearchError("Término de búsqueda no permitido");
        return false;
      }
    }

    // Validar longitud máxima
    if (term.length > 100) {
      setSearchError("La búsqueda es demasiado larga (máximo 100 caracteres)");
      return false;
    }

    setSearchError("");
    return true;
  };

  // Rate limiting: máximo 10 búsquedas por minuto
  const checkRateLimit = () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Simulación simple - en una app real usarías Redux o Context
    if (searchAttempts > 10) {
      setRateLimited(true);
      setTimeout(() => {
        setRateLimited(false);
        setSearchAttempts(0);
      }, 60000); // 1 minuto de bloqueo
      return false;
    }
    return true;
  };

  // Sanitizar datos del álbum
  const sanitizeAlbumData = (album) => {
    return {
      ...album,
      titulo: album.titulo ? String(album.titulo).substring(0, 200) : "Álbum sin título",
      artista: album.artista ? String(album.artista).substring(0, 100) : "Artista desconocido",
      imagen_url: album.imagen_url && isValidUrl(album.imagen_url) ? album.imagen_url : null,
      fecha_lanzamiento: album.fecha_lanzamiento || null,
      total_canciones: typeof album.total_canciones === 'number' ? Math.max(0, album.total_canciones) : 0,
      total_resenas: typeof album.total_resenas === 'number' ? Math.max(0, album.total_resenas) : 0,
      rating_promedio: typeof album.rating_promedio === 'number' 
        ? Math.min(1, Math.max(0, album.rating_promedio)) 
        : 0,
      popularidad: typeof album.popularidad === 'number' 
        ? Math.min(100, Math.max(0, album.popularidad)) 
        : null
    };
  };

  // Validar URL
  const isValidUrl = (url) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  // Verificar si el usuario ya reseñó este álbum
  const checkUserAlreadyReviewed = (albumId) => {
    // En una app real, harías una llamada a la API
    // Por ahora simulamos con localStorage
    const userReviews = JSON.parse(localStorage.getItem(`user_${user?.id}_reviews`) || '[]');
    return userReviews.includes(albumId);
  };

  useEffect(() => {
    const buscarAlbumes = async () => {
      if (search.trim() === "") {
        setAlbumes([]);
        return;
      }

      // Validaciones
      if (!validateSearchTerm(search)) {
        setAlbumes([]);
        return;
      }

      if (rateLimited) {
        setSearchError("Demasiadas búsquedas. Por favor espera 1 minuto.");
        setAlbumes([]);
        return;
      }

      if (!checkRateLimit()) {
        return;
      }

      setLoading(true);
      setSearchAttempts(prev => prev + 1);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

const response = await fetch(
  `http://localhost:5000/api/albumes/buscar?q=${encodeURIComponent(search)}`,
  {
    signal: controller.signal
    // Sin headers personalizados
  }
);

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            setSearchError("Demasiadas solicitudes. Por favor espera un momento.");
            setRateLimited(true);
          } else {
            setSearchError(`Error del servidor: ${response.status}`);
          }
          setAlbumes([]);
          return;
        }

        const data = await response.json();
        
        // Sanitizar datos recibidos
        const sanitizedAlbums = Array.isArray(data) 
          ? data.map(sanitizeAlbumData).slice(0, 50) // Limitar a 50 resultados
          : [];
        
        setAlbumes(sanitizedAlbums);

      } catch (error) {
        console.error("Error de red:", error);
        if (error.name === 'AbortError') {
          setSearchError("La búsqueda tardó demasiado. Intenta con un término más específico.");
        } else {
          setSearchError("Error de conexión. Verifica tu internet.");
        }
        setAlbumes([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce para evitar muchas llamadas a la API
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(buscarAlbumes, 800);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
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
    const safeRating = typeof rating === 'number' ? rating : 0;
    return (safeRating * 5).toFixed(1);
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Fecha desconocida";
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return "Fecha inválida";
      return fecha.getFullYear();
    } catch {
      return "Fecha inválida";
    }
  };

  const handleCrearResena = (album) => {
    if (!isAuthenticated || !user) {
      // Sanitizar datos antes de guardar
      const sanitizedAlbum = sanitizeAlbumData(album);
      
      const selection = sanitizedAlbum.existe_en_bd
        ? {
            selectedAlbum: {
              id: sanitizedAlbum.id_album,
              name: sanitizedAlbum.titulo.substring(0, 100),
              artist: sanitizedAlbum.artista.substring(0, 50),
              image: isValidUrl(sanitizedAlbum.imagen_url) ? sanitizedAlbum.imagen_url : null,
              year: formatearFecha(sanitizedAlbum.fecha_lanzamiento)
            }
          }
        : {
            spotifyAlbum: {
              name: sanitizedAlbum.titulo.substring(0, 100),
              artist: sanitizedAlbum.artista.substring(0, 50),
              image: isValidUrl(sanitizedAlbum.imagen_url) ? sanitizedAlbum.imagen_url : null,
              year: formatearFecha(sanitizedAlbum.fecha_lanzamiento),
              spotifyId: sanitizedAlbum.id_spotify || ''
            }
          };
      
      savePendingSelection(selection, '/resenas');
      setShowLogin(true);
      return;
    }
    
    // Verificar si ya reseñó este álbum
    if (album.existe_en_bd && checkUserAlreadyReviewed(album.id_album)) {
      if (window.confirm("Ya has reseñado este álbum. ¿Deseas ver tu reseña anterior?")) {
        navigate(`/mis-resenas`);
      }
      return;
    }
    
    // Código original con sanitización
    const sanitizedAlbum = sanitizeAlbumData(album);
    
    if (sanitizedAlbum.existe_en_bd) {
      navigate('/resenas', { 
        state: { 
          selectedAlbum: {
            id: sanitizedAlbum.id_album,
            name: sanitizedAlbum.titulo.substring(0, 100),
            artist: sanitizedAlbum.artista.substring(0, 50),
            image: isValidUrl(sanitizedAlbum.imagen_url) ? sanitizedAlbum.imagen_url : null,
            year: formatearFecha(sanitizedAlbum.fecha_lanzamiento)
          }
        }
      });
    } else {
      navigate('/resenas', { 
        state: { 
          spotifyAlbum: {
            name: sanitizedAlbum.titulo.substring(0, 100),
            artist: sanitizedAlbum.artista.substring(0, 50),
            image: isValidUrl(sanitizedAlbum.imagen_url) ? sanitizedAlbum.imagen_url : null,
            year: formatearFecha(sanitizedAlbum.fecha_lanzamiento),
            spotifyId: sanitizedAlbum.id_spotify || ''
          }
        }
      });
    }
  };

  const handleVerDetalles = (album) => {
    setAlbumSeleccionado(sanitizeAlbumData(album));
  };

  const handleCerrarModal = () => {
    setAlbumSeleccionado(null);
  };

  const handleAbrirSpotify = (album) => {
    if (album.spotify_url && isValidUrl(album.spotify_url)) {
      // Verificar que sea una URL de Spotify
      if (album.spotify_url.includes('open.spotify.com/album/')) {
        window.open(album.spotify_url, "_blank", "noopener,noreferrer");
      } else {
        alert("Enlace de Spotify no válido");
      }
    } else {
      alert("No hay enlace disponible para este álbum");
    }
  };

  // Manejar búsquedas sugeridas de forma segura
  const handleSuggestedSearch = (suggestedTerm) => {
    if (validateSearchTerm(suggestedTerm) && checkRateLimit()) {
      setSearch(suggestedTerm);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-[#1a1124] to-[#2a1a3a] text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Buscador con validaciones */}
          <div className="mb-12 text-center">
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Buscar álbum o artista..."
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) { // Limitar longitud en tiempo real
                    setSearch(value);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && validateSearchTerm(search)) {
                    setSearchAttempts(prev => prev + 1);
                  }
                }}
                className={`w-full px-6 py-5 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-pink-200 outline-none border-2 transition-all duration-300 text-xl shadow-lg font-semibold ${
                  searchError ? 'border-red-400 focus:border-red-500' : 
                  rateLimited ? 'border-yellow-400 focus:border-yellow-500' : 
                  'border-white/50 focus:border-white focus:bg-white/25'
                }`}
                maxLength={100}
                disabled={rateLimited}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <span className="text-white text-xl">🔍</span>
              </div>
              
              {searchError && (
                <div className="absolute -bottom-8 left-0 right-0 text-red-300 text-sm font-semibold">
                  ⚠️ {searchError}
                </div>
              )}
              
              {rateLimited && (
                <div className="absolute -bottom-8 left-0 right-0 text-yellow-300 text-sm font-semibold">
                  ⏳ Demasiadas búsquedas. Espera 1 minuto.
                </div>
              )}
            </div>
            <p className="text-pink-200 text-base mt-10 font-semibold">
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
          {!loading && search.trim() !== "" && !searchError && (
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
                  <span className="text-white font-semibold max-w-md truncate">
                    "{search.length > 50 ? search.substring(0, 50) + '...' : search}"
                  </span>
                </div>
              </div>

              {albumes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {albumes.map((album) => {
                    const alreadyReviewed = album.existe_en_bd && user 
                      ? checkUserAlreadyReviewed(album.id_album) 
                      : false;
                    
                    return (
                      <Card
                        key={album.id_spotify || album.id_album}
                        className={`bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border-2 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 ${
                          alreadyReviewed 
                            ? 'border-green-400/50 hover:border-green-300/70' 
                            : 'border-white/30 hover:border-white/50 hover:scale-105'
                        }`}
                      >
                        <CardContent className="p-7">
                          {/* Badge de ya reseñado */}
                          {alreadyReviewed && (
                            <div className="absolute top-3 right-3 bg-green-600/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-green-400">
                              ✅ Ya reseñado
                            </div>
                          )}

                          {/* Información principal */}
                          <div className="flex gap-5 mb-5">
                            {album.imagen_url && isValidUrl(album.imagen_url) ? (
                              <img
                                src={album.imagen_url}
                                alt={`Portada del álbum ${album.titulo}`}
                                className="w-28 h-28 rounded-2xl object-cover shadow-xl flex-shrink-0 border-2 border-white/30"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.parentNode.innerHTML = `
                                    <div class="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl flex-shrink-0 border-2 border-white/30">
                                      <span class="text-3xl">💿</span>
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl flex-shrink-0 border-2 border-white/30">
                                <span className="text-3xl">💿</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 
                                className="text-2xl font-bold text-white mb-2 leading-tight line-clamp-2"
                                title={album.titulo}
                              >
                                {album.titulo}
                              </h3>
                              <p 
                                className="text-pink-300 font-bold text-lg mb-2 line-clamp-1"
                                title={album.artista}
                              >
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
                              className={`flex-1 font-bold text-lg py-3 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl border-2 ${
                                alreadyReviewed
                                  ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-green-400/60'
                                  : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 border-white/30'
                              }`}
                              onClick={() => handleCrearResena(album)}
                            >
                              <span className="mr-2">
                                {alreadyReviewed ? '📝' : '✍️'}
                              </span>
                              {alreadyReviewed ? 'Ver Mi Reseña' : 'Crear Reseña'}
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
                    );
                  })}
                </div>
              ) : !searchError ? (
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
              ) : null}
            </div>
          )}

          {/* Estado inicial MEJORADO */}
          {!loading && search.trim() === "" && !searchError && (
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
              
              {/* Búsquedas sugeridas seguras */}
              <div className="mb-16">
                <h3 className="text-2xl font-bold text-white mb-6">Búsquedas populares</h3>
                <div className="flex justify-center gap-5 flex-wrap">
                  {['the beatles', 'bad bunny', 'pink floyd', 'taylor swift', 'queen', 'radiohead']
                    .map((suggestion, index) => (
                      <Button
                        key={index}
                        className="bg-gradient-to-r from-pink-500/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-700/30 text-white text-lg px-6 py-3 rounded-xl font-medium transition-all duration-300 border-2 border-white/20 hover:border-white/40"
                        onClick={() => handleSuggestedSearch(suggestion)}
                      >
                        {suggestion.charAt(0).toUpperCase() + suggestion.slice(1)}
                      </Button>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">🔒</div>
                  <h4 className="text-white font-bold text-xl mb-4">Búsqueda Segura</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Validación y filtrado de contenido</p>
                </div>
                <div className="bg-purple-500/10 rounded-2xl p-8 border-2 border-purple-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-purple-300">✅</div>
                  <h4 className="text-white font-bold text-xl mb-4">Sin Duplicados</h4>
                  <p className="text-purple-200 text-lg leading-relaxed font-semibold">Evita reseñar el mismo álbum</p>
                </div>
                <div className="bg-pink-500/10 rounded-2xl p-8 border-2 border-pink-400/30 backdrop-blur-sm">
                  <div className="text-4xl mb-4 text-pink-300">⚡</div>
                  <h4 className="text-white font-bold text-xl mb-4">Rendimiento</h4>
                  <p className="text-pink-200 text-lg leading-relaxed font-semibold">Búsquedas optimizadas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Detalles con sanitización */}
      {albumSeleccionado && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={handleCerrarModal}
        >
          <div 
            className="bg-gradient-to-br from-purple-700/40 to-pink-700/40 border-2 border-white/30 rounded-3xl p-8 max-w-lg w-[90%] text-white shadow-2xl animate-fadeIn relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCerrarModal}
              className="absolute top-3 right-4 text-white text-2xl hover:text-pink-300 bg-white/10 rounded-full w-10 h-10 flex items-center justify-center"
              aria-label="Cerrar modal"
            >
              ✖
            </button>
            <div className="flex flex-col items-center text-center">
              {albumSeleccionado.imagen_url && isValidUrl(albumSeleccionado.imagen_url) ? (
                <img
                  src={albumSeleccionado.imagen_url}
                  alt={albumSeleccionado.titulo}
                  className="w-40 h-40 rounded-2xl object-cover border-2 border-white/30 mb-5 shadow-xl"
                  loading="lazy"
                />
              ) : (
                <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/30 mb-5 shadow-xl">
                  <span className="text-4xl">💿</span>
                </div>
              )}
              <h2 className="text-3xl font-bold mb-3" title={albumSeleccionado.titulo}>
                {albumSeleccionado.titulo}
              </h2>
              <p className="text-pink-300 text-lg font-semibold mb-4" title={albumSeleccionado.artista}>
                {albumSeleccionado.artista}
              </p>
              <div className="space-y-2 text-sm mb-4 bg-white/10 rounded-xl p-4 w-full">
                <p className="opacity-80 flex justify-between">
                  <span>📅 Año:</span>
                  <span>{formatearFecha(albumSeleccionado.fecha_lanzamiento)}</span>
                </p>
                <p className="opacity-80 flex justify-between">
                  <span>🎵 Canciones:</span>
                  <span>{albumSeleccionado.total_canciones || "Desconocido"}</span>
                </p>
                {albumSeleccionado.popularidad && (
                  <p className="opacity-80 flex justify-between">
                    <span>🔥 Popularidad:</span>
                    <span>{albumSeleccionado.popularidad}%</span>
                  </p>
                )}
                {albumSeleccionado.existe_en_bd && albumSeleccionado.total_resenas > 0 && (
                  <p className="opacity-80 flex justify-between">
                    <span>⭐ Rating:</span>
                    <span>{formatearRating(albumSeleccionado.rating_promedio)}/5</span>
                  </p>
                )}
              </div>
              <div className="flex gap-3 mt-4 flex-wrap justify-center">
                <Button
                  onClick={() => handleCrearResena(albumSeleccionado)}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl px-6 py-3"
                >
                  {checkUserAlreadyReviewed(albumSeleccionado.id_album) ? '📝 Ver Reseña' : '✍️ Crear Reseña'}
                </Button>
                {albumSeleccionado.spotify_url && (
                  <Button
                    onClick={() => handleAbrirSpotify(albumSeleccionado)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl px-6 py-3"
                  >
                    🎧 Spotify
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} onSwitchToRegister={() => {}} />}
    </>
  );
}