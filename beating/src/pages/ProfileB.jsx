import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ChevronLeft, ChevronRight, Star, Music, Album, Calendar, MessageCircle, Heart, Users, BookOpen, Shield, AlertCircle } from "lucide-react";

// Constantes de configuración
const API_BASE_URL = "http://localhost:5000";
const ITEMS_PER_PAGE = 6;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Función para sanitizar datos de usuario
const sanitizeUserData = (user) => {
  if (!user) return { nombre_usuario: "Usuario", correo: "", fecha_creacion: "" };
  
  return {
    nombre_usuario: String(user.nombre_usuario || "Usuario").substring(0, 50),
    correo: String(user.correo || "").substring(0, 100),
    fecha_creacion: user.fecha_creacion || "",
    id: user.id || null
  };
};

// Función para validar token
const isValidToken = (token) => {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Verificar que sea un JWT válido (formato básico)
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Verificar expiración si existe
    if (payload.exp && payload.exp < now) {
      console.warn("Token expirado");
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

// Función para sanitizar contenido de reseñas
const sanitizeReviewContent = (content) => {
  if (!content) return "Sin contenido";
  
  // Remover scripts potenciales y limitar longitud
  const sanitized = String(content)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .substring(0, 500);
  
  return sanitized;
};

// Función para hacer fetch con retry
const fetchWithRetry = async (url, options, retries = MAX_RETRIES) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Unauthorized");
      }
      
      if (retries > 0 && response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};

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
  const [error, setError] = useState(null);
  const [securityAlert, setSecurityAlert] = useState(null);
  
  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);

  // Memoizar userId para evitar renders innecesarios
  const userId = React.useMemo(() => authUser?.id, [authUser]);

  // Limpiar alertas automáticamente
  useEffect(() => {
    if (securityAlert) {
      const timer = setTimeout(() => {
        setSecurityAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [securityAlert]);

  // Verificar sesión en cada carga
  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('token');
      if (!token || !isValidToken(token)) {
        logout();
        navigate('/login');
        return false;
      }
      return true;
    };

    if (!isAuthLoading) {
      if (!checkSession()) return;
      if (!userId) {
        navigate('/');
        return;
      }
    }
  }, [userId, isAuthLoading, navigate, logout]);

  // Validar datos del usuario
  const validateUserData = useCallback((data) => {
    if (!data || typeof data !== 'object') {
      throw new Error("Datos de usuario inválidos");
    }
    
    // Validar campos requeridos
    const requiredFields = ['nombre_usuario', 'correo'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Campos faltantes: ${missingFields.join(', ')}`);
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (data.correo && !emailRegex.test(data.correo)) {
      throw new Error("Formato de email inválido");
    }
    
    return true;
  }, []);

  // Cargar datos del usuario con manejo de errores mejorado
  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      if (!token || !isValidToken(token)) {
        logout();
        navigate('/login');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const endpoints = [
        `${API_BASE_URL}/api/usuarios/${userId}`,
        `${API_BASE_URL}/api/resenas/usuario/${userId}`,
        `${API_BASE_URL}/api/usuarios/${userId}/seguidos`,
        `${API_BASE_URL}/api/usuarios/${userId}/estadisticas`
      ];

      const responses = await Promise.allSettled(
        endpoints.map(endpoint => 
          fetchWithRetry(endpoint, { headers, credentials: 'include' })
        )
      );

      // Procesar respuesta del usuario
      const userResponse = responses[0];
      if (userResponse.status === 'fulfilled' && userResponse.value.ok) {
        const userData = await userResponse.value.json();
        if (validateUserData(userData)) {
          setUser(sanitizeUserData(userData));
        }
      } else {
        throw new Error("Error al cargar datos del usuario");
      }

      // Procesar reseñas
      const resenasResponse = responses[1];
      if (resenasResponse.status === 'fulfilled' && resenasResponse.value.ok) {
        const resenasData = await resenasResponse.value.json();
        const sanitizedReviews = Array.isArray(resenasData) 
          ? resenasData.map(review => ({
              ...review,
              texto_resena: sanitizeReviewContent(review.texto_resena),
              cancion_titulo: String(review.cancion_titulo || "").substring(0, 100),
              album_titulo: String(review.album_titulo || "").substring(0, 100),
              artista_cancion: String(review.artista_cancion || "").substring(0, 50),
              artista_album: String(review.artista_album || "").substring(0, 50)
            }))
          : [];
        setResenas(sanitizedReviews);
      }

      // Procesar seguidos
      const seguidosResponse = responses[2];
      if (seguidosResponse.status === 'fulfilled' && seguidosResponse.value.ok) {
        const seguidosData = await seguidosResponse.value.json();
        setSeguidos(Array.isArray(seguidosData) ? seguidosData : []);
      }

      // Procesar estadísticas
      const statsResponse = responses[3];
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        if (statsData.estadisticas) {
          setEstadisticas({
            seguidores: Math.max(0, parseInt(statsData.estadisticas.seguidores) || 0),
            seguidos: Math.max(0, parseInt(statsData.estadisticas.seguidos) || 0),
            resenas: Math.max(0, parseInt(statsData.estadisticas.resenas) || 0),
            listas_reproduccion: Math.max(0, parseInt(statsData.estadisticas.listas_reproduccion) || 0)
          });
        }
      }

    } catch (error) {
      console.error("Error cargando datos del usuario:", error);
      setError(error.message);
      
      if (error.message.includes("Unauthorized")) {
        setSecurityAlert("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [userId, navigate, logout, validateUserData]);

  useEffect(() => {
    if (!isAuthLoading && userId) {
      cargarDatosUsuario();
    }
  }, [userId, isAuthLoading, cargarDatosUsuario]);

  const handleLogout = useCallback(() => {
    // Limpiar datos sensibles
    localStorage.removeItem('token');
    sessionStorage.clear();
    logout();
    navigate('/');
  }, [logout, navigate]);

  const formatearFecha = useCallback((fechaString) => {
    if (!fechaString) return "Fecha no disponible";
    try {
      const fecha = new Date(fechaString);
      if (isNaN(fecha.getTime())) return "Fecha inválida";
      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Fecha inválida";
    }
  }, []);

  const obtenerInicial = useCallback((nombre) => {
    const safeName = String(nombre || "U");
    return safeName.charAt(0).toUpperCase();
  }, []);

  const obtenerColorFondo = useCallback((sentimiento) => {
    switch(sentimiento?.toLowerCase()) {
      case 'positivo': return 'bg-gradient-to-br from-green-500/20 to-emerald-600/15 border-green-400/50';
      case 'negativo': return 'bg-gradient-to-br from-red-500/20 to-rose-600/15 border-red-400/50';
      case 'neutral': return 'bg-gradient-to-br from-yellow-500/20 to-amber-600/15 border-yellow-400/50';
      default: return 'bg-gradient-to-br from-purple-500/20 to-pink-600/15 border-purple-400/50';
    }
  }, []);

  const obtenerColorTexto = useCallback((sentimiento) => {
    switch(sentimiento?.toLowerCase()) {
      case 'positivo': return 'text-green-400';
      case 'negativo': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-purple-400';
    }
  }, []);

  const obtenerColorBadge = useCallback((sentimiento) => {
    switch(sentimiento?.toLowerCase()) {
      case 'positivo': return 'bg-green-500/40 text-green-100 border-green-400/60';
      case 'negativo': return 'bg-red-500/40 text-red-100 border-red-400/60';
      case 'neutral': return 'bg-yellow-500/40 text-yellow-100 border-yellow-400/60';
      default: return 'bg-purple-500/40 text-purple-100 border-purple-400/60';
    }
  }, []);

  const obtenerIconoSentimiento = useCallback((sentimiento) => {
    switch(sentimiento?.toLowerCase()) {
      case 'positivo': return '✨';
      case 'negativo': return '💔';
      case 'neutral': return '🎭';
      default: return '🎵';
    }
  }, []);

  const reescalarPuntuacion = useCallback((puntuacion) => {
    if (puntuacion === null || puntuacion === undefined) return 0;
    
    const num = parseFloat(puntuacion);
    if (isNaN(num)) return 0;
    
    // Normalizar a rango 0-5
    if (num >= 0 && num <= 1) {
      return num * 5;
    }
    
    // Asegurar que no exceda 5
    return Math.min(5, Math.max(0, num));
  }, []);

  const obtenerEstrellasLlenas = useCallback((puntuacion) => {
    const puntuacionReescalada = reescalarPuntuacion(puntuacion);
    return Math.round(puntuacionReescalada);
  }, [reescalarPuntuacion]);

  // Lógica de paginación
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentResenas = resenas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(resenas.length / ITEMS_PER_PAGE);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((pageNumber) => {
    const safePage = Math.max(1, Math.min(totalPages, pageNumber));
    setCurrentPage(safePage);
  }, [totalPages]);

  // Resetear paginación cuando cambia la pestaña
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Renderizar loading state
  if (isAuthLoading || loading) {
    return (
      <main className="min-h-screen bg-[#1e1626] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-400 mx-auto mb-4"></div>
          <p className="text-2xl text-white">Cargando perfil...</p>
          <p className="text-gray-400 mt-2">Verificando seguridad...</p>
        </div>
      </main>
    );
  }

  if (!authUser) {
    return (
      <main className="min-h-screen bg-[#1e1626] flex items-center justify-center">
        <div className="text-center p-8 bg-white/10 rounded-xl max-w-md border border-red-500/50">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-4">Acceso No Autorizado</h2>
          <p className="text-gray-300 mb-6">Debes iniciar sesión para ver tu perfil.</p>
          <Button
            onClick={() => navigate('/login')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
          >
            Iniciar Sesión
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1e1626] text-white">
      {/* Alerta de seguridad */}
      {securityAlert && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="flex items-center gap-3 bg-gradient-to-r from-red-500/90 to-orange-500/90 text-white px-6 py-4 rounded-xl shadow-2xl border border-red-300/50 backdrop-blur-sm max-w-md">
            <Shield className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">{securityAlert}</p>
            </div>
            <button
              onClick={() => setSecurityAlert(null)}
              className="text-white/80 hover:text-white text-xl"
              aria-label="Cerrar alerta"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Mostrar errores */}
      {error && !securityAlert && (
        <div className="fixed top-4 right-4 z-50 animate-slideIn">
          <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 text-white px-6 py-4 rounded-xl shadow-2xl border border-yellow-300/50 backdrop-blur-sm max-w-md">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Error: {error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 py-10">
        {/* Header con opción de logout */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-red-400/50 text-red-300 hover:bg-red-500/20 hover:border-red-300 hover:text-red-200"
          >
            Cerrar Sesión
          </Button>
        </div>

        {/* Info del usuario */}
        <section className="flex flex-col items-center mb-12">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-4xl font-bold mb-4 shadow-2xl relative overflow-hidden border-4 border-white/20">
              {obtenerInicial(user.nombre_usuario)}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse"></div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold border-2 border-white">
              <Shield className="h-3 w-3 inline mr-1" />
              Verificado
            </div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
            {user.nombre_usuario}
          </h2>
          <p className="text-gray-300 mt-2">
            <span className="opacity-70">📧</span> {user.correo}
          </p>
          <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Miembro desde {formatearFecha(user.fecha_creacion)}
          </p>
          
          {/* Estadísticas */}
          <div className="flex gap-8 mt-8">
            {Object.entries(estadisticas).map(([key, value], index) => (
              <div key={key} className="text-center bg-white/5 rounded-2xl p-4 min-w-24 backdrop-blur-sm border border-white/10">
                {key === 'seguidores' && <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />}
                {key === 'seguidos' && <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />}
                {key === 'resenas' && <BookOpen className="h-6 w-6 text-blue-400 mx-auto mb-2" />}
                {key === 'listas_reproduccion' && <Music className="h-6 w-6 text-green-400 mx-auto mb-2" />}
                <div className="text-xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400 capitalize">
                  {key.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Navegación de pestañas */}
        <section className="mb-8">
          <div className="flex justify-center border-b border-gray-700">
            {[
              { id: "resenas", label: "Mis Reseñas", icon: MessageCircle, count: resenas.length },
              { id: "seguidos", label: "Siguiendo", icon: Users, count: seguidos.length }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`px-8 py-4 font-semibold transition-all flex items-center gap-3 ${
                  activeTab === tab.id
                    ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                } rounded-t-xl`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
                <span className={`px-2 py-1 rounded-full text-sm ${
                  tab.id === "resenas" 
                    ? "bg-purple-500/20 text-purple-300" 
                    : "bg-pink-500/20 text-pink-300"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Contenido de las pestañas */}
        {activeTab === "resenas" && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                <MessageCircle className="h-8 w-8 text-purple-400" />
                Tus Reseñas Musicales
              </h3>
              
              {resenas.length > 0 && (
                <div className="text-sm text-gray-400 bg-white/5 rounded-xl px-4 py-2 border border-white/10">
                  Página {currentPage} de {totalPages} • 
                  Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, resenas.length)} de {resenas.length} reseñas
                </div>
              )}
            </div>
            
            {resenas.length === 0 ? (
              <div className="text-center py-20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-3xl border-2 border-purple-400/30 backdrop-blur-sm">
                <MessageCircle className="h-20 w-20 text-purple-400 mx-auto mb-6 opacity-60" />
                <h3 className="text-2xl font-bold text-white mb-4">
                  Aún no has creado reseñas
                </h3>
                <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
                  Comparte tus experiencias musicales con la comunidad Beating
                </p>
                <Button
                  onClick={() => navigate("/explora")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-2xl shadow-2xl"
                >
                  🎵 Explorar Música
                </Button>
              </div>
            ) : (
              <>
                {/* Grid de reseñas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentResenas.map((resena) => {
                    const puntuacionReescalada = reescalarPuntuacion(resena.puntuacion);
                    const estrellasLlenas = obtenerEstrellasLlenas(resena.puntuacion);
                    const finalCardClass = resena.sentimiento 
                      ? obtenerColorFondo(resena.sentimiento)
                      : 'bg-gray-950/80 border-white/20';

                    return (
                      <Card
                        key={resena.id_resena}
                        className={`relative overflow-hidden group backdrop-blur-lg border-2 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${finalCardClass}`}
                      >
                        <CardContent className="relative z-10 p-6 h-full flex flex-col">
                          {/* Header */}
                          <div className="mb-4">
                            <div className="flex items-start gap-3 mb-4">
                              {resena.tipo === 'canción' ? (
                                <Music className="h-7 w-7 text-purple-400 flex-shrink-0 mt-1" />
                              ) : (
                                <Album className="h-7 w-7 text-pink-400 flex-shrink-0 mt-1" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-xl font-bold text-white leading-tight break-words mb-2">
                                  {resena.tipo === 'canción' ? resena.cancion_titulo : resena.album_titulo}
                                </h4>
                                <p className="text-purple-200 text-base font-semibold truncate bg-purple-500/10 px-2 py-1 rounded-lg">
                                  {resena.tipo === 'canción' ? resena.artista_cancion : resena.artista_album}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-lg ${obtenerColorTexto(resena.sentimiento)}`}>
                                  {obtenerIconoSentimiento(resena.sentimiento)}
                                </span>
                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${obtenerColorBadge(resena.sentimiento)}`}>
                                  {resena.sentimiento || "Sin clasificar"}
                                </span>
                              </div>
                              
                              {resena.puntuacion != null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                    {puntuacionReescalada.toFixed(1)}/5.0
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 mb-4">
                            <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                              <p className="text-gray-100 text-sm leading-relaxed line-clamp-3">
                                {resena.texto_resena}
                              </p>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex flex-col gap-3 pt-4 border-t border-white/20">
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2 text-gray-300">
                                <Calendar className="h-3 w-3" />
                                <span>{formatearFecha(resena.fecha_creacion)}</span>
                              </div>
                              <span className="text-gray-300 capitalize text-xs font-medium bg-white/10 px-2 py-1 rounded">
                                {resena.tipo}
                              </span>
                            </div>
                            
                            {resena.puntuacion != null && (
                              <div className="flex items-center justify-center pt-2">
                                <div className="flex items-center gap-3 bg-black/30 rounded-lg px-4 py-2">
                                  <div className="flex text-yellow-400">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-5 w-5 ${
                                          i < estrellasLlenas
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-500"
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-sm font-bold text-yellow-300">
                                    {puntuacionReescalada.toFixed(1)}/5.0
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-700 pt-8">
                    <Button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="flex items-center gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 disabled:opacity-50 px-6 py-3 rounded-xl"
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
                          className={`w-12 h-12 rounded-xl font-semibold ${
                            currentPage === page
                              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                              : "border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400"
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
                      className="flex items-center gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 disabled:opacity-50 px-6 py-3 rounded-xl"
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
            <h3 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3">
              <Users className="h-8 w-8 text-pink-400" />
              Usuarios que Sigues
            </h3>
            {seguidos.length === 0 ? (
              <div className="text-center py-20 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-3xl border-2 border-pink-400/30 backdrop-blur-sm">
                <Users className="h-20 w-20 text-pink-400 mx-auto mb-6 opacity-60" />
                <p className="text-gray-300 text-xl mb-4">
                  Aún no sigues a ningún usuario
                </p>
                <p className="text-gray-400 text-lg">
                  Descubre y conecta con otros amantes de la música
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {seguidos.map((seguido) => (
                  <Card
                    key={seguido.id_seguido}
                    className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-400/30 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg border-2 border-white/20">
                        {obtenerInicial(seguido.nombre_usuario)}
                      </div>
                      <h4 className="text-lg font-bold text-white mb-2">
                        {seguido.nombre_usuario}
                      </h4>
                      <p className="text-gray-300 text-sm mb-3 truncate" title={seguido.correo}>
                        {seguido.correo}
                      </p>
                      <p className="text-xs text-gray-400 mb-4">
                        Seguido desde {formatearFecha(seguido.fecha_seguimiento)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-pink-400/50 text-pink-300 hover:bg-pink-500/20 hover:border-pink-300 w-full rounded-xl"
                        onClick={() => {
                          // Aquí iría la navegación al perfil del usuario seguido
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