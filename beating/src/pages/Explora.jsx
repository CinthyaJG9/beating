import React, { useEffect, useState } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Explora() {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar canciones y álbumes en paralelo
        const [songsResponse, albumsResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/top_songs"),
          axios.get("http://localhost:5000/api/top_albums")
        ]);
        
        const songsData = songsResponse.data || [];
        const albumsData = albumsResponse.data || [];
        
        setSongs(songsData);
        setAlbums(albumsData);
        
        console.log('Canciones cargadas:', songsData);
        console.log('Álbumes cargados:', albumsData);
        
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Función para manejar clic en canción/álbum
  const handleItemClick = (type, item) => {
    console.log(`${type} clickeado:`, item);
    // Aquí puedes agregar navegación a detalles si lo necesitas
  };

  // Función para obtener estilos según el sentimiento
  const getReviewStyles = (reviewType, sentiment) => {
    const baseStyles = "rounded-lg p-3 border-l-4 ";
    
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positivo':
          return baseStyles + "bg-green-500/10 border-green-400 text-green-100";
        case 'negativo':
          return baseStyles + "bg-red-500/10 border-red-400 text-red-100";
        default:
          return baseStyles + "bg-blue-500/10 border-blue-400 text-blue-100";
      }
    }
    return baseStyles + "bg-purple-500/10 border-purple-400 text-purple-100";
  };

  // Función para obtener icono y color según el tipo de reseña
  const getReviewMeta = (reviewType, sentiment) => {
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positivo':
          return { icon: '⭐', color: 'text-green-300', badge: 'bg-green-500/20 text-green-300' };
        case 'negativo':
          return { icon: '💬', color: 'text-red-300', badge: 'bg-red-500/20 text-red-300' };
        default:
          return { icon: '📝', color: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' };
      }
    }
    return { icon: '★', color: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0e0e10] to-[#020107] text-white px-6 py-10">
        <div className="flex justify-center items-center h-64">
          <p className="text-xl">Cargando contenido...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0e0e10] to-[#020107] text-white px-6 py-10">
        <div className="flex justify-center items-center h-64">
          <p className="text-xl text-red-400">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0e0e10] to-[#020107] text-white relative overflow-hidden">
      {/* Elemento decorativo similar al Figma */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-gradient-to-br from-purple-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-10 relative z-10">
        <header className="flex justify-between items-center mb-16 pt-8">
          <div>
            <a href="/" className="inline-block no-underline hover:opacity-90">
              <h1 className="text-8xl font-extrabold bg-gradient-to-r from-[#ae67fa] to-[#f49867] bg-clip-text text-transparent tracking-tight">
                Beating
              </h1>
              <p className="text-gray-400 mt-4 text-xl">Descubre la música mejor valorada por la comunidad</p>
            </a>
          </div>
          
          <div className="flex items-center gap-8">
            <nav className="flex gap-12 text-2xl font-bold">
              <a href ="/" className="text-[#7b2eb0] hover:text-purple-400 transition-colors">Inicio</a>
              <a href="#" className="text-[#7b2eb0] hover:text-purple-400 transition-colors">Canciones</a>
              <a href="#" className="text-[#7b2eb0] hover:text-purple-400 transition-colors">Discos / Albums</a>
              </nav>
            
            <Button
              className="border border-[#c584f5] text-white hover:bg-purple-900/30 transition-colors text-xl py-3 px-6 rounded-md"
              onClick={() => navigate("/login")}
            >
              Iniciar Sesión
            </Button>
          </div>
        </header>

        {/* Sección Canciones Mejor Valoradas */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-5xl font-bold text-white">Canciones Mejor Valoradas</h2>
            <span className="text-sm bg-purple-600 px-3 py-1 rounded-full text-white">
              {songs.length} canciones
            </span>
          </div>
          
          {songs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {songs.map((song) => {
                const reviewMeta = getReviewMeta(song.review_type, song.review_sentiment);
                
                return (
                  <Card
                    key={song.id}
                    className="bg-gradient-to-b from-purple-900/30 to-blue-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-purple-500/30 backdrop-blur-sm"
                    onClick={() => handleItemClick('canción', song)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          {song.cover_url ? (
                            <img
                              src={song.cover_url}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                              <span className="text-2xl">♪</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white line-clamp-2 mb-1">{song.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{song.artist}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold flex items-center">
                              ★ {song.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-400">({song.total_reviews} reseñas)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reseña real de la base de datos - MEJORADO */}
                      {song.review && (
                        <div className="mt-4">
                          <div className={getReviewStyles(song.review_type, song.review_sentiment)}>
                            <div className="flex items-start gap-3 mb-2">
                              <span className={`text-lg ${reviewMeta.color}`}>
                                {reviewMeta.icon}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed font-medium">
                                  "{song.review}"
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>
                                {song.review_highlight}
                              </span>
                              
                              {song.review_type === 'real' && (
                                <span className="text-xs text-gray-400 font-medium">
                                  💫 Real
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resenas?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
                        }}
                      >
                        👁️ Ver Todas las Reseñas
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-purple-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
              <p className="text-2xl text-gray-400 mb-6">Aún no hay canciones valoradas</p>
              <Button 
                onClick={() => navigate('/resenas')}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg px-8 py-3 text-white shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
              >
                ✍️ ¡Sé el primero en reseñar!
              </Button>
            </div>
          )}
        </section>

        {/* Sección Álbumes Mejor Valorados */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-5xl font-bold text-white">Álbumes Mejor Valorados</h2>
            <span className="text-sm bg-pink-600 px-3 py-1 rounded-full text-white">
              {albums.length} álbumes
            </span>
          </div>
          
          {albums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {albums.map((album) => {
                const reviewMeta = getReviewMeta(album.review_type, album.review_sentiment);
                
                return (
                  <Card
                    key={album.id}
                    className="bg-gradient-to-b from-pink-900/30 to-purple-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-pink-500/30 backdrop-blur-sm"
                    onClick={() => handleItemClick('álbum', album)}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-20 h-20 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          {album.cover_url ? (
                            <img
                              src={album.cover_url}
                              alt={album.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-500">
                              <span className="text-2xl">💿</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-bold text-white line-clamp-2 mb-1">{album.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{album.artist}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold flex items-center">
                              ★ {album.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-400">({album.total_reviews} reseñas)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reseña real de la base de datos - MEJORADO */}
                      {album.review && (
                        <div className="mt-4">
                          <div className={getReviewStyles(album.review_type, album.review_sentiment)}>
                            <div className="flex items-start gap-3 mb-2">
                              <span className={`text-lg ${reviewMeta.color}`}>
                                {reviewMeta.icon}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed font-medium">
                                  "{album.review}"
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>
                                {album.review_highlight}
                              </span>
                              
                              {album.review_type === 'real' && (
                                <span className="text-xs text-gray-400 font-medium">
                                  💫 Real
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        className="mt-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white w-full transition-all duration-300 shadow-lg hover:shadow-pink-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resenas?album=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}`);
                        }}
                      >
                        👁️ Ver Todas las Reseñas
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-pink-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
              <p className="text-2xl text-gray-400 mb-4">Aún no hay álbumes valorados</p>
              <p className="text-sm text-gray-500 mb-6">La funcionalidad de reseñar álbumes estará disponible pronto</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}