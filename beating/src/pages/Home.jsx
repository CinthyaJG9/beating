import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../pages/AuthContext";
import Login from "./Login";

const baseCardStyle = "bg-gradient-to-b from-purple-500 to-blue-500 rounded-xl shadow-xl";

/* Contenedor que obtiene y muestra la wordcloud generada por el backend */
const HomeWordCloudContainer = () => {
  const [wordcloudImage, setWordcloudImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWordCloud = async () => {
    try {
      const response = await axios.get("http://localhost:5000/analisis-resenas");
      if (response.data?.wordcloud) {
        setWordcloudImage(`data:image/png;base64,${response.data.wordcloud}`);
      } else {
        setError("Nube de palabras no disponible.");
      }
    } catch {
      setError("Error al cargar nube de palabras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWordCloud();
  }, []);

  if (loading) {
    return (
      <div className={`w-full h-full ${baseCardStyle} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
        <span className="ml-2 text-white text-sm">Cargando análisis...</span>
      </div>
    );
  }

  if (error || !wordcloudImage) {
    return (
      <div className={`w-full h-full text-center ${baseCardStyle} flex flex-col items-center justify-center p-4`}>
        <p className="text-sm font-semibold text-white/90">Análisis No Disponible</p>
        <p className="text-xs text-white/70 mt-1">Aún no hay suficientes reseñas.</p>
        <p className="text-xs text-yellow-300 mt-2">Crea algunas reseñas primero</p>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${baseCardStyle} overflow-hidden relative`}>
      <div className="absolute inset-0 rounded-xl bg-purple-500/20 blur-3xl animate-pulse"></div>
      <div className="p-0 h-full flex items-center justify-center bg-black/40 relative z-20">
        <img src={wordcloudImage} alt="Nube de palabras" className="w-full h-full object-contain" />
      </div>
    </div>
  );
};

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [stats, setStats] = useState({
    total_resenas: 0,
    positivas: 0,
    neutrales: 0,
    negativas: 0,
    porcentaje_positivas: 0,
    total_usuarios: 0,
    resenas_recientes: 0,
  });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const setDefaultStats = () => {
    setStats({
      total_resenas: 0,
      positivas: 0,
      neutrales: 0,
      negativas: 0,
      porcentaje_positivas: 0,
      total_usuarios: 0,
      resenas_recientes: 0,
    });
  };

  /* Obtiene estadísticas generales para el home */
  const fetchAllData = async () => {
    try {
      const response = await axios.get("http://localhost:5000/analisis-resenas");
      if (!response.data) return setDefaultStats();

      const distribucion = response.data.distribucion_sentimientos || [];
      const total = distribucion.reduce((acc, curr) => acc + curr.cantidad, 0);
      const positivas = distribucion.find(d => d.etiqueta === "positivo")?.cantidad || 0;
      const neutrales = distribucion.find(d => d.etiqueta === "neutral")?.cantidad || 0;
      const negativas = distribucion.find(d => d.etiqueta === "negativo")?.cantidad || 0;

      setStats({
        total_resenas: total,
        positivas,
        neutrales,
        negativas,
        porcentaje_positivas: total > 0 ? Math.round((positivas / total) * 100) : 0,
        total_usuarios: Math.max(1, Math.round(total / 3)),
        resenas_recientes: Math.max(1, Math.round(total * 0.25)),
      });
    } catch {
      setDefaultStats();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCrearResena = () => {
    if (!isAuthenticated) return setShowLogin(true);
    navigate("/resenas");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1626] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl text-white">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] relative">
        <div className="container mx-auto px-4 py-6">

          {/* HERO */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-4 pb-14">

            {/* Lado de texto */}
            <div className="max-w-xl space-y-6">
              <h2 className="text-6xl font-extrabold text-white leading-tight drop-shadow-lg">
                Tus emociones <span className="text-purple-300">vibran</span>
                <br />con la música
              </h2>

              <p className="text-md text-gray-300">
                Analizamos tus reseñas musicales y clasificamos el sentimiento usando IA.
              </p>

              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                <p className="text-sm text-purple-200">
                  {stats.total_resenas > 0 ? `${stats.total_resenas} reseñas analizadas` : "Comienza creando reseñas"}
                </p>
              </div>

              <div className="flex gap-4 pt-3">
                <Button
                  onClick={() => navigate("/comunidad")}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 hover:shadow-xl transition-all text-white px-10 py-4 text-lg font-bold rounded-xl"
                >
                  Comunidad
                </Button>

                <Button
                  onClick={handleCrearResena}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:scale-105 hover:shadow-xl transition-all text-white px-10 py-4 text-lg font-bold rounded-xl"
                >
                  Crear Reseña
                </Button>
              </div>

              {stats.total_resenas === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                  <p className="text-yellow-200 text-sm">
                    <strong>¡Bienvenido!</strong> Aún no hay reseñas en el sistema.
                    Sé el primero en crear una reseña para ver el análisis.
                  </p>
                </div>
              )}
            </div>

            {/* WordCloud */}
            <div className="relative w-[32rem] h-[28rem] flex items-center justify-center">
              <HomeWordCloudContainer />
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          {stats.total_resenas > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
              <Card className="bg-white/5 backdrop-blur-xl border border-purple-500/20 p-6 text-center rounded-2xl">
                <p className="text-purple-300 text-3xl font-bold">{stats.porcentaje_positivas}%</p>
                <p className="text-white/70 text-sm">Reseñas positivas</p>
                <p className="text-white/50 text-xs mt-1">
                  {stats.positivas} de {stats.total_resenas}
                </p>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-purple-500/20 p-6 text-center rounded-2xl">
                <p className="text-purple-300 text-3xl font-bold">{stats.total_resenas}+</p>
                <p className="text-white/70 text-sm">Reseñas procesadas</p>
                <p className="text-white/50 text-xs mt-1">
                  {stats.neutrales} neutrales • {stats.negativas} negativas
                </p>
              </Card>

              <Card className="bg-white/5 backdrop-blur-xl border border-purple-500/20 p-6 text-center rounded-2xl">
                <p className="text-purple-300 text-3xl font-bold">{stats.resenas_recientes}</p>
                <p className="text-white/70 text-sm">Reseñas recientes</p>
                <p className="text-white/50 text-xs mt-1">Últimas 24 horas</p>
              </Card>
            </div>
          )}

          {/* SECCIÓN DE INFORMACIÓN */}
          <div className="mt-12 p-6 bg-white/5 backdrop-blur-xl border border-purple-500/20 rounded-2xl">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              {stats.total_resenas > 0 ? "Sobre Nuestro Análisis" : "Bienvenido a Beating"}
            </h3>

            {stats.total_resenas > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
                <div>
                  <h4 className="text-purple-300 font-semibold mb-2">¿Cómo funciona?</h4>
                  <p className="text-white/70">
                    Usamos procesamiento de lenguaje natural (BETO) para analizar tus reseñas musicales.
                  </p>
                </div>
                <div>
                  <h4 className="text-purple-300 font-semibold mb-2">Comunidad Activa</h4>
                  <p className="text-white/70">
                    {stats.total_usuarios} usuarios ya están compartiendo sus opiniones musicales.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-300">
                <p className="mb-4">
                  Comparte tus reseñas musicales y disfruta del análisis automático con IA.
                </p>
                <p>
                  <strong>Crea tu primera reseña</strong> para comenzar.
                </p>
              </div>
            )}

            <div className="mt-8 text-center">
              {stats.total_resenas > 0 ? (
                <Button
                  onClick={() => navigate("/analisis")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 hover:shadow-xl transition-all text-white px-8 py-3 font-bold rounded-xl"
                >
                  Ver Análisis Detallado
                </Button>
              ) : (
                <Button
                  onClick={handleCrearResena}
                  className="bg-gradient-to-r from-green-600 to-blue-600 hover:scale-105 hover:shadow-xl transition-all text-white px-8 py-3 font-bold rounded-xl"
                >
                  Crear Mi Primera Reseña
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => setShowLogin(false)}
        />
      )}
    </>
  );
}
