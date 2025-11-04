import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '../components/Tabs';
import { Tab } from '../components/Tab';
import { Pagination } from '../components/Pagination';

const Resenas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const tracksPerPage = 10;
  const navigate = useNavigate();

  // Buscar artistas
  const searchArtists = async () => {
    if (!searchTerm.trim()) {
      setMessage('Por favor ingresa un nombre de artista');
      return;
    }
    
    console.log('🔍 Buscando artista:', searchTerm);
    
    setLoading(true);
    setArtists([]);
    setSelectedArtist(null);
    setTracks([]);
    setSelectedTrack(null);
    
    try {
      const response = await axios.get(`http://localhost:5000/buscar-artista?q=${encodeURIComponent(searchTerm)}`, {
        timeout: 10000
      });
      
      console.log('✅ Respuesta del backend:', response.data);
      
      setArtists(response.data.artists || []);
      setMessage(response.data.artists?.length ? '' : 'No se encontraron artistas');
      setActiveTab('artists');
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Response status:', error.response?.status);
      
      if (error.code === 'ECONNABORTED') {
        setMessage('La búsqueda está tardando demasiado. Verifica que el servidor esté corriendo.');
      } else if (error.response?.status === 500) {
        setMessage('Error interno del servidor. Verifica la consola del backend.');
      } else {
        setMessage('Error al buscar artistas: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Obtener canciones del artista
  const fetchArtistTracks = async (artistId) => {
    setLoading(true);
    setTracks([]);
    setSelectedTrack(null);
    setCurrentPage(1);
    
    try {
      const response = await axios.get(`http://localhost:5000/canciones-artista?id=${artistId}`, {
        timeout: 30000
      });
      
      setSelectedArtist({
        ...response.data.artist,
        id: artistId
      });
      setTracks(response.data.tracks || []);
      setTotalPages(Math.ceil(response.data.tracks.length / tracksPerPage));
      setMessage(response.data.tracks?.length ? '' : 'No se encontraron canciones');
      setActiveTab('tracks');
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setMessage('La carga de canciones está tardando más de lo normal. Intenta con otro artista.');
      } else {
        setMessage('Error al obtener canciones del artista');
      }
      console.error('Error obteniendo canciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar artista
  const handleSelectArtist = (artist) => {
    setSelectedArtist(artist);
    setSearchTerm(artist.name);
    setArtists([]);
    fetchArtistTracks(artist.id);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!selectedTrack) {
      setMessage('Por favor selecciona una canción');
      return;
    }
    if (!review.trim()) {
      setMessage('Por favor escribe tu reseña');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('No estás autenticado. Por favor inicia sesión.');
        return navigate('/login');
      }

      await axios.post(
        'http://localhost:5000/resenas',
        {
          nombre: selectedTrack.name,
          artista: selectedArtist?.name || selectedTrack.artists.join(', '),
          contenido: review,
          tipo: 'cancion'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage('¡Reseña enviada con éxito!');
      setReview('');
      setSelectedTrack(null);
      setActiveTab('tracks');
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage('Sesión expirada. Por favor inicia sesión nuevamente.');
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        setMessage(error.response?.data?.error || 'Error al enviar reseña');
      }
      console.error('Error enviando reseña:', error);
    } finally {
      setLoading(false);
    }
  };

  // Crear playlist en Spotify
  const crearPlaylistSpotify = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('Debes iniciar sesión primero');
        navigate('/login');
        return;
      }

      setLoading(true);
      setMessage('Creando playlist...');
      
      const response = await axios.post(
        'http://localhost:5000/crear_playlist',
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage(response.data.message);
      if (response.data.playlist_url) {
        window.open(response.data.playlist_url, '_blank');
      }
    } catch (error) {
      setMessage(error.response?.data?.error || 'Error al crear la playlist');
      console.error('Error al crear playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  // Paginación
  const indexOfLastTrack = currentPage * tracksPerPage;
  const indexOfFirstTrack = indexOfLastTrack - tracksPerPage;
  const currentTracks = tracks.slice(indexOfFirstTrack, indexOfLastTrack);

  return (
    <div className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)]">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 
            onClick={() => navigate('/')}
            className="cursor-pointer text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Beating
          </h1>
          
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/analisis')} 
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25"
            >
              Ver Análisis
            </button>
            <button 
              onClick={crearPlaylistSpotify}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-green-500/25"
            >
              {loading ? 'Creando...' : 'Crear Playlist'}
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-all border border-white/20"
            >
              Inicio
            </button>
          </nav>
        </header>

        {/* Tabs */}
        <div className="mb-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 overflow-hidden">
          <Tabs>
            <Tab 
              active={activeTab === 'search'} 
              onClick={() => setActiveTab('search')}
              className="text-white"
            >
              Buscar Artista
            </Tab>
            <Tab 
              active={activeTab === 'artists' && artists.length > 0} 
              onClick={() => artists.length > 0 && setActiveTab('artists')}
              disabled={artists.length === 0}
              className="text-white"
            >
              Artistas
            </Tab>
            <Tab 
              active={activeTab === 'tracks' && tracks.length > 0} 
              onClick={() => tracks.length > 0 && setActiveTab('tracks')}
              disabled={tracks.length === 0}
              className="text-white"
            >
              Canciones
            </Tab>
            <Tab 
              active={activeTab === 'review' && selectedTrack} 
              onClick={() => selectedTrack && setActiveTab('review')}
              disabled={!selectedTrack}
              className="text-white"
            >
              Escribir Reseña
            </Tab>
          </Tabs>
        </div>

        {/* Contenido principal */}
        <div className="bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 p-8">
          {/* Pestaña de búsqueda */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white mb-4">Buscar Artista</h2>
              <div className="flex flex-col md:flex-row gap-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchArtists()}
                  placeholder="Busca un artista (ej. The Beatles, ABBA)..."
                  className="flex-1 p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all"
                  disabled={loading}
                />
                <button 
                  onClick={searchArtists}
                  disabled={loading || !searchTerm.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-purple-500/25"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Buscando...
                    </div>
                  ) : (
                    'Buscar Artista'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pestaña de artistas */}
          {activeTab === 'artists' && artists.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white mb-6">Artistas Encontrados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {artists.map(artist => (
                  <div 
                    key={artist.id}
                    onClick={() => handleSelectArtist(artist)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/10 group"
                  >
                    <div className="flex items-center gap-4">
                      {artist.image && (
                        <img 
                          src={artist.image} 
                          alt={artist.name}
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-400/50 group-hover:border-purple-400 transition-all"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white truncate mb-1">{artist.name}</h3>
                        {artist.genres?.length > 0 && (
                          <p className="text-sm text-purple-300 truncate">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        )}
                        {artist.followers && (
                          <p className="text-xs text-gray-400 mt-1">
                            {new Intl.NumberFormat().format(artist.followers)} seguidores
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pestaña de canciones */}
          {activeTab === 'tracks' && selectedArtist && (
            <div className="space-y-6">
              {/* Header del artista */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                {selectedArtist.image && (
                  <img 
                    src={selectedArtist.image} 
                    alt={selectedArtist.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-purple-400/50 shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-3">{selectedArtist.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {selectedArtist.genres?.length > 0 && (
                      <p className="text-purple-300">
                        <span className="font-medium text-white">Géneros:</span> {selectedArtist.genres.slice(0, 3).join(', ')}
                      </p>
                    )}
                    <p className="text-purple-300">
                      <span className="font-medium text-white">Seguidores:</span> {new Intl.NumberFormat().format(selectedArtist.followers)}
                    </p>
                    <p className="text-purple-300">
                      <span className="font-medium text-white">Canciones:</span> {tracks.length} encontradas
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-6">Canciones</h3>
              
              {currentTracks.length > 0 ? (
                <div className="space-y-4">
                  {currentTracks.map(track => (
                    <div
                      key={track.id}
                      onClick={() => {
                        setSelectedTrack(track);
                        setActiveTab('review');
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all flex items-center gap-4 group ${
                        selectedTrack?.id === track.id 
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50 shadow-lg shadow-purple-500/10' 
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 hover:shadow-lg hover:shadow-purple-500/10'
                      }`}
                    >
                      {track.album_image && (
                        <img 
                          src={track.album_image} 
                          alt={track.album}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 group-hover:scale-110 transition-transform"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-lg text-white truncate mb-1">{track.name}</h4>
                        <p className="text-purple-300 truncate text-sm">
                          {track.artists.join(', ')} • {track.album}
                        </p>
                        {track.is_top_track && (
                          <span className="inline-block mt-2 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-1 rounded-full">
                            ⭐ Popular
                          </span>
                        )}
                      </div>
                      {track.preview_url && (
                        <audio 
                          controls
                          className="hidden sm:block h-8 bg-white/10 rounded-lg"
                          src={track.preview_url}
                          onPlay={(e) => {
                            document.querySelectorAll('audio').forEach(a => {
                              if (a !== e.target) a.pause();
                            });
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">No se encontraron canciones</p>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Pestaña de reseña */}
          {activeTab === 'review' && selectedTrack && (
            <div className="space-y-6">
              {/* Header de la canción */}
              <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                {selectedTrack.album_image && (
                  <img 
                    src={selectedTrack.album_image} 
                    alt={selectedTrack.album}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-purple-400/50"
                  />
                )}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Escribe tu reseña</h2>
                  <p className="text-lg text-purple-300">
                    {selectedTrack.name} • {selectedTrack.artists.join(', ')}
                  </p>
                </div>
              </div>

              <form onSubmit={submitReview} className="space-y-6">
                <div>
                  <label htmlFor="review" className="block text-lg font-medium text-white mb-3">
                    Comparte tu opinión:
                  </label>
                  <textarea
                    id="review"
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="¿Qué te parece esta canción? ¿Qué emociones te transmite? ¿Qué recuerdos evoca?..."
                    rows="8"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tracks')}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-medium transition-all border border-white/20"
                  >
                    Volver a Canciones
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !review.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3 rounded-xl font-medium disabled:opacity-50 transition-all shadow-lg hover:shadow-purple-500/25"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enviando...
                      </div>
                    ) : (
                      'Publicar Reseña'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Mensajes de estado */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl backdrop-blur-sm border ${
            message.includes('éxito') || message.includes('Creando') || message.includes('éxito')
              ? 'bg-green-500/20 text-green-300 border-green-500/30' 
              : 'bg-red-500/20 text-red-300 border-red-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {message.includes('éxito') ? '✅' : '⚠️'} {message}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Resenas;