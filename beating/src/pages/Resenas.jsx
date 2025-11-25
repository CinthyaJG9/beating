import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '../components/Tabs';
import { Tab } from '../components/Tab';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../pages/AuthContext';
import { useLocation } from 'react-router-dom';

const Resenas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [artists, setArtists] = useState([]);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [albums, setAlbums] = useState([]); // 👈 NUEVO: Estado para álbumes
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contentType, setContentType] = useState('tracks'); // 👈 NUEVO: 'tracks' o 'albums'
 
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth(); 
  const location = useLocation();

  useEffect(() => {
    if (location.state?.selectedSong || location.state?.spotifySong || 
        location.state?.selectedAlbum || location.state?.spotifyAlbum) {
      
      // Manejar canción
      if (location.state.selectedSong || location.state.spotifySong) {
        const songData = location.state.selectedSong || location.state.spotifySong;
        
        const simulatedTrack = {
          id: songData.id || `spotify-${songData.spotifyId}`,
          name: songData.name,
          artists: [songData.artist],
          album: songData.album,
          album_image: songData.image,
          is_top_track: false,
          preview_url: null
        };

        const simulatedArtist = {
          id: `artist-${Date.now()}`,
          name: songData.artist,
          image: songData.image,
          genres: [],
          followers: 0
        };

        setSelectedArtist(simulatedArtist);
        setSelectedTrack(simulatedTrack);
        setSelectedAlbum(null);
        setContentType('tracks');
        setActiveTab('review');
      }
      
      // Manejar álbum
      if (location.state.selectedAlbum || location.state.spotifyAlbum) {
        const albumData = location.state.selectedAlbum || location.state.spotifyAlbum;
        
        const simulatedAlbum = {
          id: albumData.id || `spotify-${albumData.spotifyId}`,
          name: albumData.name,
          artist: albumData.artist,
          image: albumData.image,
          year: albumData.year,
          tracks: albumData.tracks || []
        };

        const simulatedArtist = {
          id: `artist-${Date.now()}`,
          name: albumData.artist,
          image: albumData.image,
          genres: [],
          followers: 0
        };

        setSelectedArtist(simulatedArtist);
        setSelectedAlbum(simulatedAlbum);
        setSelectedTrack(null);
        setContentType('albums');
        setActiveTab('review');
      }
      
      // Limpiar el state de navegación para evitar que se repita
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
    setAlbums([]); // 👈 Limpiar álbumes también
    setSelectedTrack(null);
    setSelectedAlbum(null);
    
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
    setAlbums([]); // 👈 Limpiar álbumes
    setSelectedTrack(null);
    setSelectedAlbum(null);
    setContentType('tracks');
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
      setTotalPages(Math.ceil(response.data.tracks.length / itemsPerPage));
      setMessage(response.data.tracks?.length ? '' : 'No se encontraron canciones');
      setActiveTab('content');
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

  // 👇 NUEVA FUNCIÓN: Obtener álbumes del artista
  const fetchArtistAlbums = async (artistId) => {
    setLoading(true);
    setAlbums([]);
    setTracks([]); // 👈 Limpiar canciones
    setSelectedTrack(null);
    setSelectedAlbum(null);
    setContentType('albums');
    setCurrentPage(1);
    
    try {
      const response = await axios.get(`http://localhost:5000/albumes-artista?id=${artistId}`, {
        timeout: 30000
      });
      
      setSelectedArtist({
        ...response.data.artist,
        id: artistId
      });
      setAlbums(response.data.albums || []);
      setTotalPages(Math.ceil(response.data.albums.length / itemsPerPage));
      setMessage(response.data.albums?.length ? '' : 'No se encontraron álbumes');
      setActiveTab('content');
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        setMessage('La carga de álbumes está tardando más de lo normal. Intenta con otro artista.');
      } else {
        setMessage('Error al obtener álbumes del artista');
      }
      console.error('Error obteniendo álbumes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Seleccionar artista
  const handleSelectArtist = (artist) => {
    setSelectedArtist(artist);
    setSearchTerm(artist.name);
    setArtists([]);
    // Por defecto cargar canciones, pero el usuario puede cambiar a álbumes
    fetchArtistTracks(artist.id);
  };

  // 👇 NUEVA FUNCIÓN: Cambiar entre canciones y álbumes
  const switchContentType = (type) => {
    setContentType(type);
    setCurrentPage(1);
    
    if (type === 'tracks' && tracks.length === 0 && selectedArtist) {
      fetchArtistTracks(selectedArtist.id);
    } else if (type === 'albums' && albums.length === 0 && selectedArtist) {
      fetchArtistAlbums(selectedArtist.id);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!selectedTrack && !selectedAlbum) {
      setMessage('Por favor selecciona una canción o álbum');
      return;
    }
    if (!review.trim()) {
      setMessage('Por favor escribe tu reseña');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!isAuthenticated) {
        setMessage('No estás autenticado. Por favor inicia sesión.');
        return navigate('/login');
      }

      const reviewData = {
        nombre: selectedTrack ? selectedTrack.name : selectedAlbum.name,
        artista: selectedArtist?.name || (selectedTrack ? selectedTrack.artists.join(', ') : selectedAlbum.artist),
        contenido: review,
        tipo: selectedTrack ? 'cancion' : 'album'
      };

      await axios.post(
        'http://localhost:5000/resenas',
        reviewData,
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
      setSelectedAlbum(null);
      setActiveTab('content');
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

  const crearPlaylistSpotify = async () => {
    try {
      setLoading(true);
      setMessage('🎵 Buscando tus canciones más positivas...');

      // 1. Primero probar conexión básica
      try {
        console.log('🔍 Probando conexión con el servidor...');
        const healthResponse = await fetch('http://localhost:5000/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (healthResponse.ok) {
          console.log('✅ Servidor conectado correctamente');
        } else {
          setMessage('❌ Servidor no responde correctamente');
          setLoading(false);
          return;
        }
      } catch (healthError) {
        setMessage('❌ No se puede conectar al servidor');
        setLoading(false);
        return;
      }

      // 2. Crear playlist CON CANCIONES POSITIVAS
      console.log('📨 Creando playlist con canciones positivas...');
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/create-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📊 Estado de la respuesta:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);

      if (data.action_required === "spotify_auth") {
        setMessage('🔑 Redirigiendo a Spotify para autenticación...');
        setTimeout(() => {
          window.location.href = data.auth_url;
        }, 1000);
      } else if (data.message) {
        setMessage(`✅ ${data.message}`);
        if (data.playlist_url) {
          setTimeout(() => {
            window.open(data.playlist_url, '_blank');
          }, 1500);
        }
      } else {
        setMessage('❌ Respuesta inesperada del servidor');
      }
      
    } catch (error) {
      console.error('❌ Error completo:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setMessage('🌐 Error de red: No se pudo conectar al servidor');
      } else if (error.message.includes('HTTP error')) {
        setMessage(`❌ Error del servidor: ${error.message}`);
      } else {
        setMessage(`❌ Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTracks = tracks.slice(indexOfFirstItem, indexOfLastItem);
  const currentAlbums = albums.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)]">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">     
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
          </nav>
        </header>

        {/* Tabs */}
        <div className="mb-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 overflow-hidden">
          <Tabs>
            <Tab 
              isActive={activeTab === 'search'} 
              onClick={() => setActiveTab('search')}
              className="text-white"
            >
              Buscar Artista
            </Tab>
            <Tab 
              isActive={activeTab === 'artists' && artists.length > 0} 
              onClick={() => artists.length > 0 && setActiveTab('artists')}
              disabled={artists.length === 0}
              className="text-white"
            >
              Artistas
            </Tab>
            <Tab 
              isActive={activeTab === 'content' && (tracks.length > 0 || albums.length > 0)} 
              onClick={() => (tracks.length > 0 || albums.length > 0) && setActiveTab('content')}
              disabled={tracks.length === 0 && albums.length === 0}
              className="text-white"
            >
              {contentType === 'tracks' ? 'Canciones' : 'Álbumes'}
            </Tab>
            <Tab 
              isActive={activeTab === 'review' && (selectedTrack || selectedAlbum)}
              onClick={() => (selectedTrack || selectedAlbum) && setActiveTab('review')}
              disabled={!selectedTrack && !selectedAlbum}
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

          {/* Pestaña de contenido (canciones o álbumes) */}
          {activeTab === 'content' && selectedArtist && (
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
                      <span className="font-medium text-white">
                        {contentType === 'tracks' ? 'Canciones:' : 'Álbumes:'}
                      </span> {contentType === 'tracks' ? tracks.length : albums.length} encontrados
                    </p>
                  </div>
                </div>
              </div>

              {/* Selector de tipo de contenido */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => switchContentType('tracks')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    contentType === 'tracks'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  🎵 Canciones
                </button>
                <button
                  onClick={() => switchContentType('albums')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    contentType === 'albums'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  💿 Álbumes
                </button>
              </div>

              {/* Lista de canciones */}
              {contentType === 'tracks' && currentTracks.length > 0 && (
                <>
                  <h3 className="text-2xl font-bold text-white mb-6">Canciones</h3>
                  <div className="space-y-4">
                    {currentTracks.map(track => (
                      <div
                        key={track.id}
                        onClick={() => {
                          setSelectedTrack(track);
                          setSelectedAlbum(null);
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
                </>
              )}

              {/* Lista de álbumes */}
              {contentType === 'albums' && currentAlbums.length > 0 && (
                <>
                  <h3 className="text-2xl font-bold text-white mb-6">Álbumes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentAlbums.map(album => (
                      <div
                        key={album.id}
                        onClick={() => {
                          setSelectedAlbum(album);
                          setSelectedTrack(null);
                          setActiveTab('review');
                        }}
                        className={`bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/10 group ${
                          selectedAlbum?.id === album.id 
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/50 shadow-lg shadow-blue-500/10' 
                            : ''
                        }`}
                      >
                        {album.image && (
                          <img 
                            src={album.image} 
                            alt={album.name}
                            className="w-full aspect-square rounded-xl object-cover mb-4 group-hover:scale-105 transition-transform"
                          />
                        )}
                        <div className="space-y-2">
                          <h4 className="font-semibold text-lg text-white truncate">{album.name}</h4>
                          <p className="text-blue-300 text-sm">{album.artist}</p>
                          {album.year && (
                            <p className="text-gray-400 text-xs">📅 {album.year}</p>
                          )}
                          {album.tracks && (
                            <p className="text-gray-400 text-xs">🎵 {album.tracks} canciones</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Mensaje si no hay contenido */}
              {(contentType === 'tracks' && currentTracks.length === 0) || 
               (contentType === 'albums' && currentAlbums.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">
                    {contentType === 'tracks' ? 'No se encontraron canciones' : 'No se encontraron álbumes'}
                  </p>
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
          {activeTab === 'review' && (selectedTrack || selectedAlbum) && (
            <div className="space-y-6">
              {/* Header de la canción o álbum */}
              <div className="flex items-center gap-6 mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                {(selectedTrack?.album_image || selectedAlbum?.image) && (
                  <img 
                    src={selectedTrack?.album_image || selectedAlbum?.image} 
                    alt={selectedTrack?.album || selectedAlbum?.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-purple-400/50"
                  />
                )}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Escribe tu reseña</h2>
                  <p className="text-lg text-purple-300">
                    {selectedTrack ? selectedTrack.name : selectedAlbum.name} • {selectedTrack ? selectedTrack.artists.join(', ') : selectedAlbum.artist}
                  </p>
                  {selectedAlbum && (
                    <p className="text-sm text-gray-400 mt-1">
                      💿 Álbum
                    </p>
                  )}
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
                    placeholder={
                      selectedTrack 
                        ? "¿Qué te parece esta canción? ¿Qué emociones te transmite? ¿Qué recuerdos evoca?..."
                        : "¿Qué te parece este álbum? ¿Cómo es la experiencia completa? ¿Cuáles son tus canciones favoritas?..."
                    }
                    rows="8"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('content');
                      setSelectedTrack(null);
                      setSelectedAlbum(null);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-medium transition-all border border-white/20"
                  >
                    Volver
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