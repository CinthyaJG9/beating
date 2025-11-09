//src/pages/ProfileB.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ChevronLeft, ChevronRight, Star, Music, Album, Calendar, MessageCircle } from "lucide-react";

export default function ProfileB() {
  const navigate = useNavigate();
  const { user: authUser, logout, isLoading: isAuthLoading } = useAuth();
  const [user, setUser] = useState({ nombre_usuario: "Cargando...", correo: "", fecha_creacion: "" });
  const [resenas, setResenas] = useState([]);
  const [seguidos, setSeguidos] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    seguidores: 0,
    seguidos: 0,
    resenas: 0,
    listas_reproduccion: 0
  });
  const [activeTab, setActiveTab] = useState("resenas");
  const [loading, setLoading] = useState(true);
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  const userId = authUser?.id;

  useEffect(() => {
    if (!isAuthLoading && userId) {
      cargarDatosUsuario();
    } else if (!isAuthLoading && !userId) {
      navigate('/');
    }
  }, [userId, isAuthLoading, navigate]);

  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [userResponse, resenasResponse, seguidosResponse, statsResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/usuarios/${userId}`, { headers }),
        fetch(`http://localhost:5000/api/resenas/usuario/${userId}`, { headers }),
        fetch(`http://localhost:5000/api/usuarios/${userId}/seguidos`, { headers }),
        fetch(`http://localhost:5000/api/usuarios/${userId}/estadisticas`, { headers })
      ]);

      if (userResponse.ok) setUser(await userResponse.json());
      if (resenasResponse.ok) setResenas(await resenasResponse.json());
      if (seguidosResponse.ok) setSeguidos(await seguidosResponse.json());
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setEstadisticas(statsData.estadisticas);
      }

    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatearFecha = (fechaString) => {
    if (!fechaString) return "Fecha no disponible";
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const obtenerInicial = (nombre) => {
    return nombre ? nombre.charAt(0).toUpperCase() : "U";
  };

  // Colores más sutiles para mejor contraste
  const obtenerColorFondo = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'bg-green-500/5 border-green-500/20 hover:border-green-400/40';
      case 'negativo': return 'bg-red-500/5 border-red-500/20 hover:border-red-400/40';
      case 'neutral': return 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-400/40';
      default: return 'bg-gray-500/5 border-gray-500/20 hover:border-gray-400/40';
    }
  };

  const obtenerColorBorde = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'border-l-green-400';
      case 'negativo': return 'border-l-red-400';
      case 'neutral': return 'border-l-yellow-400';
      default: return 'border-l-gray-400';
    }
  };

  const obtenerColorTexto = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'text-green-400';
      case 'negativo': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const obtenerColorBadge = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'negativo': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'neutral': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
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

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResenas = resenas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(resenas.length / itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Resetear paginación cuando cambia la pestaña
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  if (isAuthLoading || loading) {
    return (
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
        <div className="container mx-auto px-6 py-10">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando perfil...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
        <div className="container mx-auto px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-pink-400 mb-4">Inicia sesión para continuar</h2>
          <p className="text-gray-400">Debes iniciar sesión para ver tu perfil.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
      <div className="container mx-auto px-6 py-10">
        {/* Info del usuario */}
        <section className="flex flex-col items-center mb-12">
          <div className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-4xl font-bold mb-4 shadow-lg shadow-purple-500/25">
            {obtenerInicial(user.nombre_usuario)}
          </div>
          <h2 className="text-2xl font-semibold">{user.nombre_usuario}</h2>
          <p className="text-sm text-gray-400 mt-2">{user.correo}</p>
          <p className="text-xs text-gray-500 mt-1">
            Miembro desde {formatearFecha(user.fecha_creacion)}
          </p>
          
          {/* Estadísticas */}
          <div className="flex gap-6 mt-6">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-400">{estadisticas.seguidores}</div>
              <div className="text-xs text-gray-400">Seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-pink-400">{estadisticas.seguidos}</div>
              <div className="text-xs text-gray-400">Siguiendo</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">{estadisticas.resenas}</div>
              <div className="text-xs text-gray-400">Reseñas</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">{estadisticas.listas_reproduccion}</div>
              <div className="text-xs text-gray-400">Listas</div>
            </div>
          </div>
        </section>

        {/* Navegación de pestañas */}
        <section className="mb-8">
          <div className="flex justify-center border-b border-gray-700">
            <button
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === "resenas"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("resenas")}
            >
              <MessageCircle className="h-4 w-4" />
              Mis Reseñas ({resenas.length})
            </button>
            <button
              className={`px-6 py-3 font-medium transition-all flex items-center gap-2 ${
                activeTab === "seguidos"
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setActiveTab("seguidos")}
            >
              👥 Siguiendo ({seguidos.length})
            </button>
          </div>
        </section>

        {/* Contenido de las pestañas */}
        {activeTab === "resenas" && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageCircle className="h-6 w-6 text-purple-400" />
                Tus Reseñas
              </h3>
              
              {/* Información de paginación */}
              {resenas.length > 0 && (
                <div className="text-sm text-gray-400">
                  Página {currentPage} de {totalPages} • 
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, resenas.length)} de {resenas.length} reseñas
                </div>
              )}
            </div>
            
            {resenas.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/10">
                <MessageCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-4">
                  Aún no has creado reseñas.
                </p>
                <Button
                  onClick={() => navigate("/explora")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
                >
                  ¡Empieza en la sección de Explorar!
                </Button>
              </div>
            ) : (
              <>
                {/* Grid de reseñas con mejor contraste */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {currentResenas.map((resena) => (
                    <Card
                      key={resena.id_resena}
                      className={`${obtenerColorFondo(resena.sentimiento)} rounded-xl border-l-4 ${obtenerColorBorde(resena.sentimiento)} shadow-lg hover:shadow-xl hover:scale-102 transition-all duration-300 backdrop-blur-sm`}
                    >
                      <CardContent className="p-5 h-full flex flex-col">
                        {/* Header con información principal */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-white mb-1 line-clamp-1">
                              {resena.tipo === 'canción' ? resena.cancion_titulo : resena.album_titulo}
                            </h4>
                            <p className="text-sm text-gray-300 line-clamp-1">
                              {resena.tipo === 'canción' ? resena.artista_cancion : resena.artista_album}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                            <span className={`text-xl ${obtenerColorTexto(resena.sentimiento)}`}>
                              {obtenerIconoSentimiento(resena.sentimiento)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Badge de sentimiento */}
                        <div className="mb-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${obtenerColorBadge(resena.sentimiento)}`}>
                            {resena.sentimiento}
                          </span>
                        </div>
                        
                        {/* Contenido de la reseña */}
                        <div className="flex-1 mb-4">
                          <p className="text-gray-200 text-sm leading-relaxed line-clamp-4 bg-black/10 rounded-lg p-3">
                            "{resena.texto_resena}"
                          </p>
                        </div>
                        
                        {/* Información adicional */}
                        <div className="space-y-2 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-gray-400">
                              {resena.tipo === 'canción' ? (
                                <Music className="h-3 w-3" />
                              ) : (
                                <Album className="h-3 w-3" />
                              )}
                              <span className="capitalize">{resena.tipo}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(resena.fecha_creacion).toLocaleDateString('es-ES')}</span>
                            </div>
                          </div>
                          
                          {/* Puntuación */}
                          {resena.puntuacion && (
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-2">
                                <div className="flex text-yellow-400">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < Math.round(resena.puntuacion * 5)
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-600"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">
                                  ({resena.puntuacion.toFixed(1)})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-700 pt-6">
                    <Button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          onClick={() => goToPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          className={`w-10 h-10 p-0 ${
                            currentPage === page
                              ? "bg-purple-600 text-white"
                              : "border-gray-600 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      onClick={nextPage}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "seguidos" && (
          <section>
            <h3 className="text-2xl font-bold mb-6 text-center">
              Usuarios que sigues 👥
            </h3>
            {seguidos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-4">
                  Aún no sigues a ningún usuario.
                </p>
                <p className="text-sm text-gray-500">
                  Descubre y sigue a otros usuarios para ver sus reseñas y actividad.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {seguidos.map((seguido) => (
                  <Card
                    key={seguido.id_seguido}
                    className="bg-gray-800/30 border border-gray-700 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                        {obtenerInicial(seguido.nombre_usuario)}
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">
                        {seguido.nombre_usuario}
                      </h4>
                      <p className="text-sm text-gray-400 mb-3">
                        {seguido.correo}
                      </p>
                      <p className="text-xs text-gray-500">
                        Seguido desde {formatearFecha(seguido.fecha_seguimiento)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700 w-full"
                        onClick={() => {
                          console.log("Ver perfil de:", seguido.nombre_usuario);
                        }}
                      >
                        Ver perfil
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}