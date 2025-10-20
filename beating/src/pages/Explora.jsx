import React, { useEffect, useState } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Explora() {
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [filteredAlbums, setFilteredAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'positive', 'negative', 'neutral'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [songsResponse, albumsResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/top_songs"),
          axios.get("http://localhost:5000/api/top_albums")
        ]);
        
        const songsData = (songsResponse.data || []).slice(0, 10); // Limitar a top 10
        const albumsData = (albumsResponse.data || []).slice(0, 10); // Limitar a top 10
        
        setSongs(songsData);
        setAlbums(albumsData);
        setFilteredSongs(songsData);
        setFilteredAlbums(albumsData);
        
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setError("Error al cargar los datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar por sentimiento
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredSongs(songs);
      setFilteredAlbums(albums);
    } else {
      const sentimentMap = {
        'positive': 'positivo',
        'negative': 'negativo',
        'neutral': 'neutral'
      };
      
      const targetSentiment = sentimentMap[activeFilter];
      
      setFilteredSongs(songs.filter(song => 
        song.review_sentiment === targetSentiment
      ));
      setFilteredAlbums(albums.filter(album => 
        album.review_sentiment === targetSentiment
      ));
    }
  }, [activeFilter, songs, albums]);

  const handleItemClick = (type, item) => {
    console.log(`${type} clickeado:`, item);
  };

  // MEJORADO: Colores más legibles y con mejor contraste
  const getReviewStyles = (reviewType, sentiment) => {
    const baseStyles = "rounded-lg p-3 border-l-4 font-medium ";
    
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positivo':
          return baseStyles + "bg-green-900/40 border-green-500 text-green-50 shadow-lg";
        case 'negativo':
          return baseStyles + "bg-red-900/40 border-red-500 text-red-50 shadow-lg";
        default:
          return baseStyles + "bg-blue-900/40 border-blue-400 text-blue-50 shadow-lg";
      }
    }
    return baseStyles + "bg-purple-900/40 border-purple-500 text-purple-50 shadow-lg";
  };

  // MEJORADO: Iconos y colores más consistentes
  const getReviewMeta = (reviewType, sentiment) => {
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positivo':
          return { 
            icon: '⭐', 
            color: 'text-yellow-300',
            badge: 'bg-green-800/60 text-green-100 border border-green-600',
            label: 'Positivo'
          };
        case 'negativo':
          return { 
            icon: '💬', 
            color: 'text-red-200',
            badge: 'bg-red-800/60 text-red-100 border border-red-600',
            label: 'Negativo'
          };
        default:
          return { 
            icon: '📝', 
            color: 'text-blue-200',
            badge: 'bg-blue-800/60 text-blue-100 border border-blue-600',
            label: 'Neutral'
          };
      }
    }
    return { 
      icon: '★', 
      color: 'text-purple-200',
      badge: 'bg-purple-800/60 text-purple-100 border border-purple-600',
      label: 'General'
    };
  };

  // Estadísticas para mostrar en los filtros
  const getStats = () => {
    const positiveSongs = songs.filter(s => s.review_sentiment === 'positivo').length;
    const negativeSongs = songs.filter(s => s.review_sentiment === 'negativo').length;
    const neutralSongs = songs.filter(s => s.review_sentiment === 'neutral').length;
    
    const positiveAlbums = albums.filter(a => a.review_sentiment === 'positivo').length;
    const negativeAlbums = albums.filter(a => a.review_sentiment === 'negativo').length;
    const neutralAlbums = albums.filter(a => a.review_sentiment === 'neutral').length;

    return {
      positive: positiveSongs + positiveAlbums,
      negative: negativeSongs + negativeAlbums,
      neutral: neutralSongs + neutralAlbums,
      total: songs.length + albums.length
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#0e0e10] to-[#020107] text-white px-6 py-10">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-xl">Cargando contenido...</p>
          </div>
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
      {/* Elemento decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[50%] h-[50%] bg-gradient-to-br from-purple-900/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-10 relative z-10">
        <header className="flex justify-between items-center mb-12 pt-8">
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
              <a href="/" className="text-[#7b2eb0] hover:text-purple-400 transition-colors">Inicio</a>
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

        {/* Filtros por sentimiento */}
        <section className="mb-12">
          <div className="bg-gray-900/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700">
            <h3 className="text-2xl font-bold mb-4 text-white">Filtrar por sentimiento</h3>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => setActiveFilter('all')}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeFilter === 'all' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Todos ({stats.total})
              </Button>
              <Button
                onClick={() => setActiveFilter('positive')}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeFilter === 'positive' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                👍 Positivas ({stats.positive})
              </Button>
              <Button
                onClick={() => setActiveFilter('negative')}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeFilter === 'negative' 
                    ? 'bg-red-600 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                👎 Negativas ({stats.negative})
              </Button>
              <Button
                onClick={() => setActiveFilter('neutral')}
                className={`px-6 py-3 rounded-lg transition-all ${
                  activeFilter === 'neutral' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                💬 Neutrales ({stats.neutral})
              </Button>
            </div>
          </div>
        </section>

        {/* Sección Canciones Mejor Valoradas */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-5xl font-bold text-white">Canciones Mejor Valoradas</h2>
            <span className="text-sm bg-purple-600 px-3 py-1 rounded-full text-white">
              {filteredSongs.length} canciones
            </span>
          </div>
          
          {filteredSongs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSongs.map((song, index) => {
                const reviewMeta = getReviewMeta(song.review_type, song.review_sentiment);
                
                return (
                  <Card
                    key={song.id}
                    className="bg-gradient-to-b from-purple-900/30 to-blue-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-purple-500/30 backdrop-blur-sm shadow-xl"
                    onClick={() => handleItemClick('canción', song)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">
                      {/* Badge de posición */}
                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          {song.cover_url ? (
                            <img
                              src={song.cover_url}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                              <span className="text-xl">♪</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">{song.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{song.artist}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold flex items-center text-sm">
                              ★ {song.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-400">({song.total_reviews} reseñas)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reseña mejorada */}
                      {song.review && (
                        <div className="mt-3">
                          <div className={getReviewStyles(song.review_type, song.review_sentiment)}>
                            <div className="flex items-start gap-2 mb-2">
                              <span className={`text-base ${reviewMeta.color} mt-0.5`}>
                                {reviewMeta.icon}
                              </span>
                              <div className="flex-1">
                                <p className="text-xs leading-relaxed">
                                  "{song.review}"
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>
                                {song.review_highlight}
                              </span>
                              
                              {song.review_type === 'real' && (
                                <span className="text-xs text-gray-300 font-medium">
                                  {reviewMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resenas?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
                        }}
                      >
                        👁️ Ver Reseñas
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-purple-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
              <p className="text-2xl text-gray-400 mb-6">
                {activeFilter === 'all' 
                  ? "Aún no hay canciones valoradas" 
                  : `No hay canciones ${activeFilter}`
                }
              </p>
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
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-5xl font-bold text-white">Álbumes Mejor Valorados</h2>
            <span className="text-sm bg-pink-600 px-3 py-1 rounded-full text-white">
              {filteredAlbums.length} álbumes
            </span>
          </div>
          
          {filteredAlbums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAlbums.map((album, index) => {
                const reviewMeta = getReviewMeta(album.review_type, album.review_sentiment);
                
                return (
                  <Card
                    key={album.id}
                    className="bg-gradient-to-b from-pink-900/30 to-purple-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-pink-500/30 backdrop-blur-sm shadow-xl"
                    onClick={() => handleItemClick('álbum', album)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">
                      {/* Badge de posición */}
                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                          {album.cover_url ? (
                            <img
                              src={album.cover_url}
                              alt={album.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-500">
                              <span className="text-xl">💿</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">{album.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{album.artist}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold flex items-center text-sm">
                              ★ {album.rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-400">({album.total_reviews} reseñas)</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reseña mejorada */}
                      {album.review && (
                        <div className="mt-3">
                          <div className={getReviewStyles(album.review_type, album.review_sentiment)}>
                            <div className="flex items-start gap-2 mb-2">
                              <span className={`text-base ${reviewMeta.color} mt-0.5`}>
                                {reviewMeta.icon}
                              </span>
                              <div className="flex-1">
                                <p className="text-xs leading-relaxed">
                                  "{album.review}"
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>
                                {album.review_highlight}
                              </span>
                              
                              {album.review_type === 'real' && (
                                <span className="text-xs text-gray-300 font-medium">
                                  {reviewMeta.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        className="mt-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white w-full text-sm transition-all duration-300 shadow-lg hover:shadow-pink-500/25"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/resenas?album=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}`);
                        }}
                      >
                        👁️ Ver Reseñas
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-pink-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
              <p className="text-2xl text-gray-400 mb-4">
                {activeFilter === 'all' 
                  ? "Aún no hay álbumes valorados" 
                  : `No hay álbumes ${activeFilter}`
                }
              </p>
              <p className="text-sm text-gray-500 mb-6">La funcionalidad de reseñar álbumes estará disponible pronto</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}