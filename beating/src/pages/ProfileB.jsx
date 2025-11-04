//src/pages/ProfileB.jsx
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate , Link} from "react-router-dom";
import { useAuth } from "./AuthContext";

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

  const userId = authUser?.id;

  useEffect(() => {
    // Solo cargamos datos si el Contexto NO está cargando Y tenemos un userId
    if (!isAuthLoading && userId) {
      cargarDatosUsuario();
    } else if (!isAuthLoading && !userId) {
      // Si el contexto terminó de cargar y NO hay usuario, redirigir
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
    logout(); // Esto limpia el contexto Y el localStorage
    navigate('/'); // Redirigir al Home
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

  const obtenerColorSentimiento = (sentimiento) => {
    switch(sentimiento) {
      case 'positivo': return 'text-green-400';
      case 'negativo': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-gray-400';
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
    
    // 6. Fallback (si AuthRequired falla, aunque no debería ser necesario)
  if (!authUser) {
    return (
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
      <div className="container mx-auto px-6 py-10 text-center">
          <h2 className="text-2xl font-bold text-pink-400 mb-4">Inicia sesión para continuar</h2>
          <p className="text-gray-400">Debes iniciar sesión para ver tu perfil.</p>
      </div>
      </main>
    )
  }

  return (
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
        <div className="container mx-auto px-6 py-10">
          {/* Header */}
          <header className="flex justify-between items-center mb-12">
            {/* Este h1 se puede quitar si ya está en el Navbar, pero lo dejamos por si acaso */}
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Beating
            </h1>
            <Button
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </header>

          {/* Info del usuario */}
          <section className="flex flex-col items-center mb-12">
            <div className="w-28 h-28 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-4xl font-bold mb-4 shadow-lg">
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
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "resenas"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("resenas")}
              >
                Mis Reseñas ({resenas.length})
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === "seguidos"
                    ? "text-purple-400 border-b-2 border-purple-400"
                    : "text-gray-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("seguidos")}
              >
                Siguiendo ({seguidos.length})
              </button>
            </div>
          </section>

          {/* Contenido de las pestañas */}
          {activeTab === "resenas" && (
            <section>
              <h3 className="text-2xl font-bold mb-6 text-center">
                Tus Reseñas 🎧
              </h3>
              {resenas.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-4">
                    Aún no has creado reseñas.
                  </p>
                  <Button
                    onClick={() => navigate("/explora")} // Cambiado de "/explore" a "/explora"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    ¡Empieza en la sección de Explorar!
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resenas.map((resena) => (
                    <Card
                      key={resena.id_resena}
                      className="bg-gradient-to-b from-purple-500/20 to-blue-500/10 border border-purple-400/30 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-semibold text-white">
                            {resena.tipo === 'canción' ? resena.cancion_titulo : resena.album_titulo}
                          </h4>
                          <span className={`text-sm ${obtenerColorSentimiento(resena.sentimiento)}`}>
                            {obtenerIconoSentimiento(resena.sentimiento)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                          {resena.texto_resena}
                        </p>
                        
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>
                            {resena.tipo === 'canción' ? '🎵 Canción' : '💿 Álbum'}
                          </span>
                          <span>
                            {formatearFecha(resena.fecha_creacion)}
                          </span>
                        </div>
                        
                        {resena.puntuacion && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex text-yellow-400">
                              {"★".repeat(Math.round(resena.puntuacion * 5))}
                              {"☆".repeat(5 - Math.round(resena.puntuacion * 5))}
                            </div>
                            <span className="text-xs text-gray-400">
                              ({resena.puntuacion * 5}/5)
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
                      className="bg-gradient-to-b from-pink-500/20 to-purple-500/10 border border-pink-400/30 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
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
                            // Aquí podrías navegar al perfil del usuario
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