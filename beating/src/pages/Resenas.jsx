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
  const [totalPages, setTotalPages] = useState(1); // ✅ Solo una declaración
  
  const tracksPerPage = 10;
  const navigate = useNavigate();

  // Buscar artistas
// Buscar artistas
const searchArtists = async () => {
  if (!searchTerm.trim()) {
    setMessage('Por favor ingresa un nombre de artista');
    return;
  }
  
  console.log('🔍 Buscando artista:', searchTerm); // ← Agregar este log
  
  setLoading(true);
  setArtists([]);
  setSelectedArtist(null);
  setTracks([]);
  setSelectedTrack(null);
  
  try {
    const response = await axios.get(`http://localhost:5000/buscar-artista?q=${encodeURIComponent(searchTerm)}`, {
      timeout: 10000
    });
    
    console.log('✅ Respuesta del backend:', response.data); // ← Agregar este log
    
    setArtists(response.data.artists || []);
    setMessage(response.data.artists?.length ? '' : 'No se encontraron artistas');
    setActiveTab('artists');
  } catch (error) {
    console.error('❌ Error completo:', error); // ← Agregar este log
    console.error('❌ Response data:', error.response?.data); // ← Agregar este log
    console.error('❌ Response status:', error.response?.status); // ← Agregar este log
    
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
      
      // ✅ Actualizar totalPages basado en las canciones recibidas
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
      
      // Obtener token de Spotify (esto depende de tu implementación)
      //const spotifyToken = await obtenerTokenSpotify();
      
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

  // Función para obtener token de Spotify (simulada - debes implementarla)
  const obtenerTokenSpotify = async () => {
    // Implementación real dependerá de tu flujo de autenticación
    // Esto es solo un ejemplo
    if (window.Spotify) {
      try {
        const token = window.Spotify.getAccessToken();
        if (token) return token;
      } catch (e) {
        console.error("Error obteniendo token de Spotify:", e);
      }
    }
    
    // Alternativa: puedes implementar un flujo OAuth aquí
    throw new Error("Autenticación con Spotify no configurada");
  };

  // Paginación
 // Paginación
  const indexOfLastTrack = currentPage * tracksPerPage;
  const indexOfFirstTrack = indexOfLastTrack - tracksPerPage;
  const currentTracks = tracks.slice(indexOfFirstTrack, indexOfLastTrack);

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 p-4 bg-white rounded-lg shadow-sm">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          Beating
        </h1>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/analisis')} 
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
          >
            Ver Análisis
          </button>
      <button 
        onClick={crearPlaylistSpotify}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
      >
        {loading ? 'Procesando...' : 'Crear Playlist'}
          </button>
          <button 
            onClick={() => navigate('/')} 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition-all"
          >
            Inicio
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <Tabs>
          <Tab 
            active={activeTab === 'search'} 
            onClick={() => setActiveTab('search')}
          >
            Buscar Artista
          </Tab>
          <Tab 
            active={activeTab === 'artists' && artists.length > 0} 
            onClick={() => artists.length > 0 && setActiveTab('artists')}
            disabled={artists.length === 0}
          >
            Artistas
          </Tab>
          <Tab 
            active={activeTab === 'tracks' && tracks.length > 0} 
            onClick={() => tracks.length > 0 && setActiveTab('tracks')}
            disabled={tracks.length === 0}
          >
            Canciones
          </Tab>
          <Tab 
            active={activeTab === 'review' && selectedTrack} 
            onClick={() => selectedTrack && setActiveTab('review')}
            disabled={!selectedTrack}
          >
            Escribir Reseña
          </Tab>
        </Tabs>
      </div>

      {/* Contenido de las pestañas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Pestaña de búsqueda */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Buscar Artista</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchArtists()}
                placeholder="Busca un artista (ej. The Beatles, ABBA)..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all"
                disabled={loading}
              />
              <button 
                onClick={searchArtists}
                disabled={loading || !searchTerm.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        )}

        {/* Pestaña de artistas */}
        {activeTab === 'artists' && artists.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Artistas Encontrados</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {artists.map(artist => (
                <div 
                  key={artist.id}
                  onClick={() => handleSelectArtist(artist)}
                  className="p-4 hover:bg-purple-50 cursor-pointer rounded-lg border border-gray-200 transition-all hover:border-purple-300 hover:shadow-md flex items-center gap-4"
                >
                  {artist.image && (
                    <img 
                      src={artist.image} 
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-purple-200"
                    />
                  )}
                  <div className="overflow-hidden">
                    <h3 className="font-semibold text-lg truncate">{artist.name}</h3>
                    {artist.genres?.length > 0 && (
                      <p className="text-sm text-gray-600 truncate">
                        {artist.genres.slice(0, 2).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pestaña de canciones */}
      {activeTab === 'tracks' && selectedArtist && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
            {selectedArtist.image && (
              <img 
                src={selectedArtist.image} 
                alt={selectedArtist.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-purple-200 shadow-md"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedArtist.name}</h2>
              {selectedArtist.genres?.length > 0 && (
                <p className="text-gray-600 mb-1">
                  <span className="font-medium">Géneros:</span> {selectedArtist.genres.slice(0, 3).join(', ')}
                </p>
              )}
              <p className="text-gray-600">
                <span className="font-medium">Seguidores:</span> {new Intl.NumberFormat().format(selectedArtist.followers)}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Canciones encontradas:</span> {tracks.length}
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-4">Canciones</h3>
          
          {currentTracks.length > 0 ? (
            <div className="space-y-3">
              {currentTracks.map(track => (
                <div
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    setActiveTab('review');
                  }}
                  className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center gap-4 ${
                    selectedTrack?.id === track.id 
                      ? 'border-purple-500 bg-purple-50 shadow-md' 
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  {track.album_image && (
                    <img 
                      src={track.album_image} 
                      alt={track.album}
                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-lg truncate">{track.name}</h4>
                    <p className="text-gray-600 truncate">
                      {track.artists.join(', ')} • {track.album}
                    </p>
                    {track.is_top_track && (
                      <span className="inline-block mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                  {track.preview_url && (
                    <audio 
                      controls
                      className="hidden sm:block h-8"
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
            <p className="text-gray-500 text-center py-8">No se encontraron canciones</p>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
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
            <div className="flex items-center gap-4 mb-6">
              {selectedTrack.album_image && (
                <img 
                  src={selectedTrack.album_image} 
                  alt={selectedTrack.album}
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Escribe tu reseña</h2>
                <p className="text-lg text-gray-600">
                  {selectedTrack.name} • {selectedTrack.artists.join(', ')}
                </p>
              </div>
            </div>

            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label htmlFor="review" className="block text-sm font-medium text-gray-700 mb-2">
                  Comparte tu opinión:
                </label>
                <textarea
                  id="review"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="¿Qué te parece esta canción? ¿Qué emociones te transmite?..."
                  rows="6"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('tracks')}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium transition-all"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading || !review.trim()}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                >
                  {loading ? 'Enviando...' : 'Publicar Reseña'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Mensajes de estado */}
      {message && (
        <div className={`mt-6 p-4 rounded-lg ${
          message.includes('éxito') || message.includes('Creando')
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default Resenas;