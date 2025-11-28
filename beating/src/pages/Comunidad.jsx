import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const getReviewStyles = (reviewType, sentiment) => {
    const baseStyles = "rounded-lg p-3 border-l-4 font-medium ";
    
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positive':
          return baseStyles + "bg-green-900/40 border-green-500 text-green-50 shadow-lg";
        case 'negative':
          return baseStyles + "bg-red-900/40 border-red-500 text-red-50 shadow-lg";
        default: // neutral
          return baseStyles + "bg-blue-900/40 border-blue-400 text-blue-50 shadow-lg";
      }
    }
    return baseStyles + "bg-purple-900/40 border-purple-500 text-purple-50 shadow-lg";
};

const getReviewMeta = (reviewType, sentiment) => {
    if (reviewType === 'real') {
      switch(sentiment) {
        case 'positive':
          return { icon: '⭐', color: 'text-yellow-300', badge: 'bg-green-800/60 text-green-100 border border-green-600', label: 'Positivo' };
        case 'negative':
          return { icon: '💬', color: 'text-red-200', badge: 'bg-red-800/60 text-red-100 border border-red-600', label: 'Negativo' };
        default: // neutral
          return { icon: '📝', color: 'text-blue-200', badge: 'bg-blue-800/60 text-blue-100 border border-blue-600', label: 'Neutral' };
      }
    }
    return { icon: '★', color: 'text-purple-200', badge: 'bg-purple-800/60 text-purple-100 border border-purple-600', label: 'General' };
};

const Comunidad = () => {
    const navigate = useNavigate();
    
    // Estados para la comunidad
    const [communityUsers, setCommunityUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Almacenamiento de datos y filtro inicial en 'positive'
    const [allSongs, setAllSongs] = useState([]);
    const [allAlbums, setAllAlbums] = useState([]);

    const [activeFilter, setActiveFilter] = useState('positive'); 
    
    // Estados generales
    const [activeTab, setActiveTab] = useState('users'); // 'users' o 'popular'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estilos constantes
    const appBackground = "min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white";
    const cardStyle = "bg-purple-950/60 rounded-xl p-6 shadow-lg border border-purple-500/40 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const communityRes = await axios.get('http://localhost:5000/comunidad');
                
                if (communityRes.data && communityRes.data.users) {
                    setCommunityUsers(communityRes.data.users); 
                } else {
                    setCommunityUsers([]); 
                }

                const [
                    songsP, songsN, songsU,
                    albumsP, albumsN, albumsU
                ] = await Promise.all([
                    axios.get("http://localhost:5000/api/top_songs?sentiment=positive&limit=10").catch(e => e.response),
                    axios.get("http://localhost:5000/api/top_songs?sentiment=negative&limit=10").catch(e => e.response),
                    axios.get("http://localhost:5000/api/top_songs?sentiment=neutral&limit=10").catch(e => e.response),
                    axios.get("http://localhost:5000/api/top_albums?sentiment=positive&limit=10").catch(e => e.response),
                    axios.get("http://localhost:5000/api/top_albums?sentiment=negative&limit=10").catch(e => e.response),
                    axios.get("http://localhost:5000/api/top_albums?sentiment=neutral&limit=10").catch(e => e.response)
                ]);

                const getSafeData = (res, sentiment) => {
                    const data = res?.data || [];
                    return data.map(item => ({ ...item, review_sentiment: sentiment })); 
                };

                setAllSongs([
                    ...getSafeData(songsP, 'positive'), 
                    ...getSafeData(songsN, 'negative'), 
                    ...getSafeData(songsU, 'neutral')
                ]);
                setAllAlbums([
                    ...getSafeData(albumsP, 'positive'), 
                    ...getSafeData(albumsN, 'negative'), 
                    ...getSafeData(albumsU, 'neutral')
                ]);

            } catch (err) {
                console.error("Error fetching data:", err);
                setError('Error al cargar datos. Verifica la conexión con el servidor Flask.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    
    const obtenerInicial = (nombre) => {
        return nombre ? nombre.charAt(0).toUpperCase() : "U";
    };

    const getColorForGenre = (genre) => {
        const hash = genre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = ['purple', 'pink', 'blue', 'green', 'yellow'];
        const color = colors[hash % colors.length];
        return `bg-${color}-500/30 text-${color}-300`;
    };

    const filteredUsers = communityUsers.filter(user => 
        user.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const filterContent = (content) => {
        // Filtra por el sentimiento activo (positive, negative, neutral)
        return content.filter(item => {
            return item.review_sentiment === activeFilter;
        });
    };

    const getFilterTitle = (filter) => {
        switch(filter) {
            case 'positive': return 'Positivas';
            case 'negative': return 'Negativas';
            case 'neutral': return 'Neutrales';
            default: return 'General';
        }
    }

    if (loading) return (
        <div className={`flex items-center justify-center h-screen ${appBackground}`}>
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Cargando datos de la comunidad y contenido...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className={`flex items-center justify-center h-screen ${appBackground}`}>
            <div className="text-center p-8 bg-white/10 rounded-xl max-w-md border border-red-500/50">
                <h2 className="text-2xl font-bold text-pink-400 mb-4">Error de Conexión</h2>
                <p className="text-gray-300 mb-6">{error}</p>
                <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-700">Volver a Inicio</Button>
            </div>
        </div>
    );
    
    return (
        <div className={appBackground}>
            <div className="container mx-auto px-6 py-12 max-w-7xl pt-24">
                <header className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Comunidad Beating
                    </h1>
                    <p className="text-xl text-gray-400">Encuentra usuarios y el contenido más popular.</p>
                </header>
                
                {/* Selector de Pestañas */}
                <div className="mb-8 flex justify-center border-b border-white/20">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-8 py-3 font-semibold transition-colors rounded-t-lg ${
                            activeTab === 'users' ? 'text-pink-400 border-b-2 border-pink-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Usuarios Activos
                    </button>
                    <button
                        onClick={() => setActiveTab('popular')}
                        className={`px-8 py-3 font-semibold transition-colors rounded-t-lg ${
                            activeTab === 'popular' ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Contenido Popular
                    </button>
                </div>

                {/* Contenido de Pestaña: USUARIOS */}
                {activeTab === 'users' && (
                    <section>
                        {/* Buscador */}
                        <div className="flex justify-center mb-10">
                            <div className="w-full max-w-2xl">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400">🔎</span> 
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre de usuario..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full p-4 pl-12 bg-gray-900/70 border border-purple-500/40 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Grid de Usuarios */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <Card key={user.id} className={cardStyle}>
                                        <CardContent className="flex flex-col items-center text-center gap-4">
                                            {/* Icono de Perfil */}
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg flex-shrink-0 border-4 border-purple-500/50">
                                                {obtenerInicial(user.nombre_usuario)}
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-white mb-2">{user.nombre_usuario}</h3>

                                            <div className="flex justify-around w-full border-y border-white/10 py-3 mb-4">
                                                <div className="text-center">
                                                    <span className="text-blue-400 mx-auto mb-1 block">💬</span>
                                                    <p className="text-lg font-bold text-white">{user.resenas || 0}</p>
                                                    <p className="text-xs text-gray-400">Reseñas</p>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-pink-400 mx-auto mb-1 block">❤️</span>
                                                    <p className="text-lg font-bold text-white">{user.seguidores || 0}</p>
                                                    <p className="text-xs text-gray-400">Seguidores</p>
                                                </div>
                                                <div className="text-center">
                                                    <span className="text-green-400 mx-auto mb-1 block">🎶</span>
                                                    <p className="text-lg font-bold text-white">Top 5</p>
                                                    <p className="text-xs text-gray-400">Canciones</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap justify-center gap-2 mb-4">
                                                {user.genres && user.genres.slice(0, 3).map((genre) => (
                                                    <span 
                                                        key={genre}
                                                        className={`text-xs px-3 py-1 rounded-full font-medium ${getColorForGenre(genre)}`}
                                                    >
                                                        {genre}
                                                    </span>
                                                ))}
                                            </div>
                                        
                                            <Button
                                                onClick={() => navigate(`/perfil/${user.id}`)}
                                                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-md mt-4"
                                            >
                                                Ver Perfil
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="lg:col-span-4 text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-xl text-gray-400">
                                        {communityUsers.length === 0 && searchTerm === '' 
                                            ? 'Aún no hay usuarios activos en la comunidad.'
                                            : `No se encontraron usuarios que coincidan con "${searchTerm}".`
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Contenido de Pestaña: POPULAR */}
                {activeTab === 'popular' && (
                    <section>
                        {/* Filtros por sentimiento */}
                        <div className="mb-8">
                            <h3 className="text-2xl font-bold mb-4 text-white text-center">Filtrar Contenido</h3>
                            <div className="flex justify-center flex-wrap gap-4">
                                
                                <button
                                    onClick={() => setActiveFilter('positive')}
                                    className={`px-6 py-3 rounded-lg transition-all text-lg font-semibold ${
                                        activeFilter === 'positive' ? 'bg-green-600 text-white shadow-lg shadow-green-500/25' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    👍 Positivas
                                </button>
                                <button
                                    onClick={() => setActiveFilter('negative')}
                                    className={`px-6 py-3 rounded-lg transition-all text-lg font-semibold ${
                                        activeFilter === 'negative' ? 'bg-red-600 text-white shadow-lg shadow-red-500/25' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    👎 Negativas
                                </button>
                                <button
                                    onClick={() => setActiveFilter('neutral')}
                                    className={`px-6 py-3 rounded-lg transition-all text-lg font-semibold ${
                                        activeFilter === 'neutral' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    💬 Neutrales
                                </button>
                            </div>
                        </div>

                        {/* Sección Canciones */}
                        <h2 className="text-4xl font-bold text-white mb-6 border-b border-white/10 pb-2">
                            🎵 Canciones {getFilterTitle(activeFilter)}
                        </h2>
                        {filterContent(allSongs).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
                                {filterContent(allSongs).map((song, index) => {
                                    // Usamos el campo que forzamos en el fetch: 'review_sentiment'
                                    const sentiment = song.review_sentiment || 'all'; 
                                    const reviewMeta = getReviewMeta(song.review_type, sentiment);
                                    
                                    return (
                                        <Card key={song.id} className="bg-gradient-to-b from-purple-900/30 to-blue-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-purple-500/30 backdrop-blur-sm shadow-xl">
                                            <CardContent className="p-5 flex flex-col h-full">
                                                <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">#{index + 1}</div>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-16 h-16 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                                                        {song.cover_url ? (
                                                            <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover"/>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500"><span className="text-xl">♪</span></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">{song.title}</h3>
                                                        <p className="text-sm text-gray-300 line-clamp-1">{song.artist}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-yellow-400 font-semibold flex items-center text-sm">★ {song.rating?.toFixed(1) || '0.0'}</span>
                                                            <span className="text-xs text-gray-400">({song.total_reviews} reseñas)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {song.review && (<div className="mt-3">
                                                    <div className={getReviewStyles(song.review_type, sentiment)}>
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <span className={`text-base ${reviewMeta.color} mt-0.5`}>{reviewMeta.icon}</span>
                                                            <div className="flex-1"><p className="text-xs leading-relaxed">"{song.review}"</p></div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>{song.review_highlight}</span>
                                                            {song.review_type === 'real' && (<span className="text-xs text-gray-300 font-medium">{reviewMeta.label}</span>)}
                                                        </div>
                                                    </div>
                                                </div>)}
                                                <Button onClick={(e) => {e.stopPropagation(); navigate(`/resenas?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);}} className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-full text-sm transition-all duration-300 shadow-lg hover:shadow-purple-500/25">👁️ Ver Reseñas</Button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-purple-500/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm"><p className="text-2xl text-gray-400 mb-6">No hay canciones {getFilterTitle(activeFilter)}.</p></div>
                        )}

                        {/* Sección Álbumes */}
                        <h2 className="text-4xl font-bold text-white mb-6 border-b border-white/10 pb-2">
                            💿 Álbumes {getFilterTitle(activeFilter)}
                        </h2>
                        {filterContent(allAlbums).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filterContent(allAlbums).map((album, index) => {
                                    const sentiment = album.review_sentiment || (album.rating > 4.0 ? 'positive' : album.rating < 2.0 ? 'negative' : 'neutral'); 
                                    const reviewMeta = getReviewMeta(album.review_type, sentiment);
                                    
                                    return (
                                        <Card key={album.id} className="bg-gradient-to-b from-pink-900/30 to-purple-900/20 rounded-2xl hover:scale-105 transition-all duration-300 cursor-pointer border border-pink-500/30 backdrop-blur-sm shadow-xl">
                                            <CardContent className="p-5 flex flex-col h-full">
                                                <div className="absolute -top-2 -left-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">#{index + 1}</div>
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-16 h-16 rounded-xl shadow-lg overflow-hidden bg-gray-700 flex-shrink-0">
                                                        {album.cover_url ? (
                                                            <img src={album.cover_url} alt={album.title} className="w-full h-full object-cover"/>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-500"><span className="text-xl">💿</span></div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-lg font-bold text-white line-clamp-2 mb-1">{album.title}</h3>
                                                        <p className="text-sm text-gray-300 line-clamp-1">{album.artist}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-yellow-400 font-semibold flex items-center text-sm">★ {album.rating?.toFixed(1) || '0.0'}</span>
                                                            <span className="text-xs text-gray-400">({album.total_reviews} reseñas)</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {album.review && (<div className="mt-3">
                                                    <div className={getReviewStyles(album.review_type, sentiment)}>
                                                        <div className="flex items-start gap-2 mb-2">
                                                            <span className={`text-base ${reviewMeta.color} mt-0.5`}>{reviewMeta.icon}</span>
                                                            <div className="flex-1"><p className="text-xs leading-relaxed">"{album.review}"</p></div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs px-2 py-1 rounded-full ${reviewMeta.badge} font-medium`}>{album.review_highlight}</span>
                                                            {album.review_type === 'real' && (<span className="text-xs text-gray-300 font-medium">{reviewMeta.label}</span>)}
                                                        </div>
                                                    </div>
                                                </div>)}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-pink-500/10 rounded-2xl border border-pink-500/20 backdrop-blur-sm">
                                <p className="text-2xl text-gray-400 mb-6">No hay álbumes {getFilterTitle(activeFilter)}.</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default Comunidad;