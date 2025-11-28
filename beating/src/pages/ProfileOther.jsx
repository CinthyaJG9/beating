import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useNavigate, useParams, Link } from "react-router-dom"; 
import { useAuth } from "./AuthContext";
import axios from 'axios'; // Necesario para las llamadas POST/DELETE
// Asumiendo que estos iconos están disponibles
import { ChevronLeft, ChevronRight, Star, Music, Album, Calendar, MessageCircle, Heart, Users, BookOpen } from "lucide-react"; 

// --- FUNCIONES DE ESTILO (Omitidas por brevedad) ---
const obtenerColorFondo = (sentimiento) => {
    switch(sentimiento) {
        case 'positivo': return 'bg-gradient-to-br from-green-500/20 to-emerald-600/15 border-green-400/50';
        case 'negativo': return 'bg-gradient-to-br from-red-500/20 to-rose-600/15 border-red-400/50';
        case 'neutral': return 'bg-gradient-to-br from-yellow-500/20 to-amber-600/15 border-yellow-400/50';
        default: return 'bg-gradient-to-br from-purple-500/20 to-pink-600/15 border-purple-400/50';
    }
};
const obtenerColorTexto = (sentimiento) => {
    switch(sentimiento) {
        case 'positivo': return 'text-green-400';
        case 'negativo': return 'text-red-400';
        case 'neutral': return 'text-yellow-400';
        default: return 'text-purple-400';
    }
};
const obtenerColorBadge = (sentimiento) => {
    switch(sentimiento) {
        case 'positivo': return 'bg-green-500/40 text-green-100 border-green-400/60';
        case 'negativo': return 'bg-red-500/40 text-red-100 border-red-400/60';
        case 'neutral': return 'bg-yellow-500/40 text-yellow-100 border-yellow-400/60';
        default: return 'bg-purple-500/40 text-purple-100 border-purple-400/60';
    }
};
const obtenerIconoSentimiento = (sentimiento) => {
    switch(sentimiento) {
        case 'positivo': return '✨';
        case 'negativo': return '💔';
        case 'neutral': return '🎭';
        default: return '🎵';
    }
};
const reescalarPuntuacion = (puntuacion) => {
    if (puntuacion === null || puntuacion === undefined) return 0;
    if (puntuacion >= 0 && puntuacion <= 1) { return puntuacion * 5; }
    return puntuacion;
};
const obtenerEstrellasLlenas = (puntuacion) => {
    const puntuacionReescalada = reescalarPuntuacion(puntuacion);
    return Math.round(puntuacionReescalada);
};
const formatearFecha = (fechaString) => {
    if (!fechaString) return "Fecha no disponible";
    const fecha = new Date(fechaString);
    return fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};
const obtenerInicial = (nombre) => {
    return nombre ? nombre.charAt(0).toUpperCase() : "U";
};
// --- FIN FUNCIONES DE ESTILO ---


export default function ProfileOther() {
    const navigate = useNavigate();
    // 🛑 CAPTURAMOS EL ID DEL USUARIO A MOSTRAR DE LA URL
    const { userId } = useParams(); // userId es el ID del perfil que estamos viendo
    // 🛑 DESESTRUCTURAMOS authUser (PARA EL ID DEL SEGUIDOR)
    const { isAuthenticated, user: authUser, isLoading: isAuthLoading } = useAuth();
    
    // El user data que cargaremos de la API (es el perfil del OTRO usuario)
    const [profileUser, setProfileUser] = useState({ nombre_usuario: "Cargando...", correo: "", fecha_creacion: "" });
    const [resenas, setResenas] = useState([]);
    const [seguidos, setSeguidos] = useState([]);
    const [estadisticas, setEstadisticas] = useState({
        seguidores: 0, seguidos: 0, resenas: 0, listas_reproduccion: 0
    });
    const [isFollowing, setIsFollowing] = useState(false); // 🛑 NUEVO ESTADO: Rastrea el estado de seguimiento
    const [activeTab, setActiveTab] = useState("resenas");
    const [loading, setLoading] = useState(true);
    // 🛑 NUEVO ESTADO: Manejo de error crítico (usuario no encontrado)
    const [notFound, setNotFound] = useState(false); 
    
    // Estado para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(6);


    // 🛑 LÓGICA DE CARGA DE DATOS Y ESTADO DE SEGUIMIENTO
    useEffect(() => {
        // Debemos definir la función aquí para que tenga acceso al estado del componente
        const cargarDatosUsuario = async (profileId) => {
            if (!profileId || typeof profileId !== 'string') {
                 setNotFound(true); 
                 setLoading(false);
                 return;
            }

            try {
                setLoading(true);
                setNotFound(false); 
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                // 🛑 DEBUG: Confirmar que el ID se está usando
                console.log(`[PROFILE OTHER] Buscando datos para ID: ${profileId}`);

                const [userResponse, resenasResponse, seguidosResponse, statsResponse] = await Promise.all([
                    fetch(`http://localhost:5000/api/usuarios/${profileId}`, { headers }), 
                    fetch(`http://localhost:5000/api/resenas/usuario/${profileId}`, { headers }), 
                    fetch(`http://localhost:5000/api/usuarios/${profileId}/seguidos`, { headers }), 
                    fetch(`http://localhost:5000/api/usuarios/${profileId}/estadisticas`, { headers })
                ]);

                // 2. 🛑 Verificar estado de seguimiento (solo si estamos autenticados)
                if (isAuthenticated && authUser && authUser.id !== profileId) {
                    // Esta llamada es fundamental para inicializar isFollowing
                    const followStatusRes = await fetch(`http://localhost:5000/api/seguimientos/estado/${profileId}`, { headers });
                    if (followStatusRes.ok) {
                        const data = await followStatusRes.json();
                        setIsFollowing(data.is_following);
                    }
                }
                
                // Manejo de errores
                if (userResponse.status === 404) {
                     setNotFound(true);
                     setProfileUser({ nombre_usuario: "Usuario No Encontrado" });
                     return;
                }
                if (!userResponse.ok) throw new Error(`API usuarios falló con estado: ${userResponse.status}`);


                if (userResponse.ok) setProfileUser(await userResponse.json());
                if (resenasResponse.ok) { setResenas(await resenasResponse.json()); } else { setResenas([]); }
                if (seguidosResponse.ok) { setSeguidos(await seguidosResponse.json()); } else { setSeguidos([]); }
                if (statsResponse.ok) { 
                    const statsData = await statsResponse.json();
                    setEstadisticas(statsData.estadisticas);
                } else { setEstadisticas({ seguidores: 0, seguidos: 0, resenas: 0, listas_reproduccion: 0 }); }


            } catch (error) {
                console.error("Error cargando datos del usuario (API Fallida):", error);
                setNotFound(true); 
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            cargarDatosUsuario(userId); 
        } else if (!isAuthLoading && !userId) {
             navigate('/comunidad'); 
        }
    }, [userId, navigate, isAuthLoading, isAuthenticated, authUser]); // 🛑 authUser es necesario para verificar el seguimiento


    // 🛑 FUNCIÓN PARA SEGUIR/DEJAR DE SEGUIR
    const handleFollow = async () => {
        const followerId = authUser?.id; 
        const followedId = userId; // 🛑 CORRECCIÓN CLAVE: Usamos userId aquí

        if (!isAuthenticated || !followerId) {
            console.error("Autenticación necesaria para seguir.");
            navigate('/login');
            return;
        }

        if (followerId === followedId) return;

        const method = isFollowing ? 'DELETE' : 'POST';
        
        // 🛑 La URL del backend DELETE es /api/seguimientos/<id_seguido>
        const url = isFollowing 
            ? `http://localhost:5000/api/seguimientos/${followedId}` 
            : `http://localhost:5000/api/seguimientos`; 
        
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
            
            setLoading(true);

            if (method === 'POST') {
                // POST: Envía el ID del seguido en el body
                await axios.post(url, { id_seguido: followedId }, { headers });
            } else {
                // DELETE: Envía el ID del seguido en la URL (La API de Flask está configurada para este formato)
                await axios.delete(url, { headers });
            }
            
            // 🛑 Actualizar el estado local y las estadísticas
            setIsFollowing(!isFollowing); 
            setEstadisticas(prev => ({
                ...prev,
                seguidores: isFollowing ? prev.seguidores - 1 : prev.seguidores + 1
            }));

        } catch (error) {
            console.error("Error al ejecutar seguimiento (API Fallida):", error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    };


    // Lógica de paginación (igual que en ProfileB)
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentResenas = resenas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(resenas.length / itemsPerPage);

    const nextPage = () => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); } };
    const prevPage = () => { if (currentPage > 1) { setCurrentPage(currentPage - 1); } };
    const goToPage = (pageNumber) => { setCurrentPage(pageNumber); };

    React.useEffect(() => { setCurrentPage(1); }, [activeTab]);

    if (loading) {
        return (
			<main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
				<div className="container mx-auto px-6 py-10">
					<div className="flex justify-center items-center h-64">
						<div className="text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
							<p className="text-gray-400">Buscando perfil {userId}...</p>
						</div>
					</div>
				</div>
			</main>
		);
    }
    
    // MANEJO DE ERROR 404 (USUARIO NO ENCONTRADO)
    if (notFound) {
        return (
            <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
                <div className="container mx-auto px-6 py-20 text-center">
                    <h2 className="text-4xl font-bold text-pink-400 mb-4">❌ Usuario No Encontrado</h2>
                    <p className="text-gray-400 mb-6">Lo sentimos, el perfil con ID "{userId}" no existe o no se pudo cargar.</p>
                    <Button onClick={() => navigate('/comunidad')} className="bg-purple-600 hover:bg-purple-700">
                        Volver a Comunidad
                    </Button>
                </div>
            </main>
        );
    }


    return (
        <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white">
            <div className="container mx-auto px-6 py-10">
                
                {/* Header: Se añade botón para volver a Comunidad */}
                <header className="flex justify-between items-center mb-12">
                    <Button
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 flex items-center gap-2"
                        onClick={() => navigate('/comunidad')}
                    >
                        <ChevronLeft className="h-4 w-4" /> Volver a Comunidad
                    </Button>
                    
                    {/* 🛑 BOTÓN DE SEGUIMIENTO DINÁMICO */}
                    {/* Solo mostrar si está autenticado, tiene un ID, y no es su propio perfil */}
                    {isAuthenticated && authUser && authUser.id !== userId && (
                        <Button 
                            className={isFollowing ? 
                                "bg-pink-500/20 text-pink-300 border border-pink-400/50 hover:bg-pink-500/30" : 
                                "bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/25"}
                            onClick={handleFollow}
                            disabled={loading}
                        >
                            {isFollowing ? 'Dejar de Seguir' : 'Seguir'}
                        </Button>
                    )}
                </header>

                {/* Info del usuario (usando profileUser) */}
                <section className="flex flex-col items-center mb-12">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-4xl font-bold mb-4 shadow-2xl shadow-purple-500/25 relative overflow-hidden">
                            {obtenerInicial(profileUser.nombre_usuario)}
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse"></div>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                        {profileUser.nombre_usuario}
                    </h2>
                    <p className="text-gray-300 mt-2 flex items-center gap-2">
                        <span>⭐</span> Perfil Público
                    </p>
                    <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Miembro desde {formatearFecha(profileUser.fecha_creacion)}
                    </p>
                    
                    {/* Estadísticas mejoradas */}
                    <div className="flex gap-8 mt-8">
                        <div className="text-center bg-white/5 rounded-2xl p-4 min-w-24 backdrop-blur-sm border border-white/10">
                            <Users className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-purple-400">{estadisticas.seguidores}</div>
                            <div className="text-xs text-gray-400">Seguidores</div>
                        </div>
                        <div className="text-center bg-white/5 rounded-2xl p-4 min-w-24 backdrop-blur-sm border border-white/10">
                            <Heart className="h-6 w-6 text-pink-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-pink-400">{estadisticas.seguidos}</div>
                            <div className="text-xs text-gray-400">Siguiendo</div>
                        </div>
                        <div className="text-center bg-white/5 rounded-2xl p-4 min-w-24 backdrop-blur-sm border border-white/10">
                            <BookOpen className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-blue-400">{estadisticas.resenas}</div>
                            <div className="text-xs text-gray-400">Reseñas</div>
                        </div>
                        <div className="text-center bg-white/5 rounded-2xl p-4 min-w-24 backdrop-blur-sm border border-white/10">
                            <Music className="h-6 w-6 text-green-400 mx-auto mb-2" />
                            <div className="text-xl font-bold text-green-400">{estadisticas.listas_reproduccion}</div>
                            <div className="text-xs text-gray-400">Listas</div>
                        </div>
                    </div>
                </section>

                {/* Navegación de pestañas (Reseñas/Seguidos) */}
                <section className="mb-8">
                    <div className="flex justify-center border-b border-gray-700">
                        <button
                            className={`px-8 py-4 font-semibold transition-all flex items-center gap-3 ${
                                activeTab === "resenas"
                                ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            } rounded-t-xl`}
                            onClick={() => setActiveTab("resenas")}
                        >
                            <MessageCircle className="h-5 w-5" />
                            Reseñas de {profileUser.nombre_usuario}
                            <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-sm">
                                {resenas.length}
                            </span>
                        </button>
                        <button
                            className={`px-8 py-4 font-semibold transition-all flex items-center gap-3 ${
                                activeTab === "seguidos"
                                ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/10"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            } rounded-t-xl`}
                            onClick={() => setActiveTab("seguidos")}
                        >
                            <Users className="h-5 w-5" />
                            Usuarios que sigue
                            <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full text-sm">
                                {seguidos.length}
                            </span>
                        </button>
                    </div>
                </section>

                {/* Contenido de pestaña RESEÑAS */}
                {activeTab === "resenas" && (
                    <section>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                                <MessageCircle className="h-8 w-8 text-purple-400" />
                                Reseñas
                            </h3>
                            
                            {/* Información de paginación */}
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
                                    Este usuario no ha creado reseñas
                                </h3>
                            </div>
                        ) : (
                            <>
                                {/* Grid de reseñas MEJORADO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentResenas.map((resena) => {
                                        const puntuacionReescalada = reescalarPuntuacion(resena.puntuacion);
                                        const estrellasLlenas = obtenerEstrellasLlenas(resena.puntuacion);
                                        const baseCardClass = obtenerColorFondo(resena.sentimiento);
                                        const finalCardClass = resena.sentimiento ? baseCardClass : 'bg-gray-950/80 border-white/20';

                                        return (
                                            <Card
                                                key={resena.id_resena}
                                                className={`relative overflow-hidden group backdrop-blur-lg border-2 rounded-2xl shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${finalCardClass}`}
                                            >
                                                <CardContent className="relative z-10 p-6 h-full flex flex-col">
                                                    
                                                    {/* INICIO CONTENIDO DE LA RESEÑA (Añadido) */}
                                                    <div className="mb-4">
                                                        {/* TÍTULO Y ARTISTA */}
                                                        <div className="flex items-start gap-3 mb-4">
                                                            {resena.tipo === 'canción' ? (
                                                                <Music className="h-7 w-7 text-purple-400 flex-shrink-0 mt-1" />
                                                            ) : (
                                                                <Album className="h-7 w-7 text-pink-400 flex-shrink-0 mt-1" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-xl font-bold text-white leading-tight break-words mb-2 drop-shadow-sm">
                                                                    {resena.tipo === 'canción' ? resena.cancion_titulo : resena.album_titulo}
                                                                </h4>
                                                                <p className="text-purple-200 text-base font-semibold truncate bg-purple-500/10 px-2 py-1 rounded-lg">
                                                                    {resena.tipo === 'canción' ? resena.artista_cancion : resena.artista_album}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Sentimiento y puntuación */}
                                                        <div className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-lg ${obtenerColorTexto(resena.sentimiento)}`}>
                                                                    {obtenerIconoSentimiento(resena.sentimiento)}
                                                                </span>
                                                                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${obtenerColorBadge(resena.sentimiento)}`}>
                                                                    {resena.sentimiento}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Puntuación destacada */}
                                                            {resena.puntuacion !== null && resena.puntuacion !== undefined && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-yellow-300 bg-yellow-500/20 px-2 py-1 rounded">
                                                                        {puntuacionReescalada.toFixed(1)}/5.0
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Contenido de la reseña */}
                                                    <div className="flex-1 mb-4">
                                                        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                                                            <p className="text-gray-100 text-sm leading-relaxed line-clamp-3">
                                                                {resena.texto_resena}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Footer informativo */}
                                                    <div className="flex flex-col gap-3 pt-4 border-t border-white/20">
                                                        <div className="flex justify-between items-center text-xs">
                                                            <div className="flex items-center gap-2 text-gray-300">
                                                                <Calendar className="h-3 w-3" />
                                                                <span>{new Date(resena.fecha_creacion).toLocaleDateString('es-ES', { 
                                                                    day: 'numeric', 
                                                                    month: 'short', 
                                                                    year: 'numeric' 
                                                                })}</span>
                                                            </div>
                                                            <span className="text-gray-300 capitalize text-xs font-medium bg-white/10 px-2 py-1 rounded">
                                                                {resena.tipo}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* ESTRELLAS CORREGIDAS - ESCALA 0-5 */}
                                                        {resena.puntuacion !== null && resena.puntuacion !== undefined && (
                                                            <div className="flex items-center justify-center pt-2">
                                                                <div className="flex items-center gap-3 bg-black/30 rounded-lg px-4 py-2">
                                                                    <div className="flex text-yellow-400">
                                                                        {Array.from({ length: 5 }, (_, i) => (
                                                                            <Star
                                                                                key={i}
                                                                                className={`h-5 w-5 ${
                                                                                    i < estrellasLlenas
                                                                                        ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
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
                                                    {/* FIN CONTENIDO DE LA RESEÑA (Añadido) */}
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                {/* Paginación mejorada */}
                                <div className="flex items-center justify-between border-t border-gray-700 pt-8 mt-8">
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
                            </>
                        )}
                    </section>
                )}

                {/* Contenido de pestaña SEGUIDOS */}
                {activeTab === "seguidos" && (
                    <section>
                        <h3 className="text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3">
                            <Users className="h-8 w-8 text-pink-400" />
                            Usuarios que sigue
                        </h3>
                        {seguidos.length === 0 ? (
                            <div className="text-center py-20 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-3xl border-2 border-pink-400/30 backdrop-blur-sm">
                                <Users className="h-20 w-20 text-pink-400 mx-auto mb-6 opacity-60" />
                                <p className="text-gray-300 text-xl mb-4">
                                    Este usuario no sigue a nadie.
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
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                                                {obtenerInicial(seguido.nombre_usuario)}
                                            </div>
                                            <h4 className="text-lg font-bold text-white mb-2">
                                                {seguido.nombre_usuario}
                                            </h4>
                                            <Link
                                                to={`/perfil/${seguido.id_seguido}`}
                                                className="w-full"
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-pink-400/50 text-pink-300 hover:bg-pink-500/20 hover:border-pink-300 w-full rounded-xl"
                                                >
                                                    Ver perfil
                                                </Button>
                                            </Link>
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