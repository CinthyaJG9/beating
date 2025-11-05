import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

const AnalisisResenas = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const navigate = useNavigate();
  const appBackground = "min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] text-white";
  const cardStyle = "bg-white/5 rounded-xl p-6 shadow-lg border border-white/10 backdrop-blur-sm";

  useEffect(() => {
    const fetchAnalisis = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/analisis-resenas', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar análisis');
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalisis();
  }, [navigate]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-400 mx-auto mb-4"></div>
        <p className="text-2xl text-white">Cargando análisis...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className={`flex items-center justify-center h-screen ${appBackground}`}>
      <div className="text-center p-8 bg-white/10 rounded-xl max-w-md border border-red-500/50">
        <h2 className="text-2xl font-bold text-pink-400 mb-4">Error</h2>
        <p className="text-gray-300 mb-6">{error}</p>
        <Button 
          onClick={() => navigate(-1)} 
          className="bg-purple-600 hover:bg-purple-700 text-white" // Botón principal púrpura
        >
          Volver atrás
        </Button>
      </div>
    </div>
  );

  return (
    <div className={appBackground}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Análisis de Reseñas
            </h1>
            <p className="text-gray-400">Descubre insights sobre las opiniones de los usuarios</p>
          </div>
          
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10" // Botón outline blanco
          >
            Volver atrás
          </Button>
        </div>

        {/* Tabs */}
        <div className={`mb-8 ${cardStyle} p-0`}> 
          <div className="flex overflow-x-auto border-b border-white/10">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'general' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-400 hover:text-white'}`}
            >
              Visión General
            </button>
            <button
              onClick={() => setActiveTab('canciones')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'canciones' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-400 hover:text-white'}`}
            >
              Top Canciones
            </button>
            <button
              onClick={() => setActiveTab('sentimientos')}
              className={`px-6 py-3 font-medium transition-colors ${activeTab === 'sentimientos' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-400 hover:text-white'}`}
            >
              Distribución
            </button>
          </div>
        </div>

        {/* Contenido de las pestañas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nube de palabras */}
          {activeTab === 'general' && (
            <div className={`${cardStyle} lg:col-span-2`}>
              <h2 className="text-2xl font-bold text-white mb-4">Palabras más usadas en reseñas positivas</h2>
              <div className="bg-black/20 rounded-xl p-4 border border-purple-500/30">
                <img
                  src={`data:image/png;base64,${data.wordcloud}`} 
                  alt="Nube de palabras"
                  className="w-full h-auto rounded"
                />
              </div>
            </div>
          )}

          {/* Top canciones */}
          {(activeTab === 'general' || activeTab === 'canciones') && (
            <div className={cardStyle}>
              <h2 className="text-2xl font-bold text-white mb-4">Top 10 Canciones Mejor Calificadas</h2>
              <div className="bg-black/20 rounded-xl p-4 mb-4 border border-purple-500/30">
                <img 
                  src={`data:image/png;base64,${data.top_songs}`} 
                  alt="Top canciones"
                  className="w-full h-auto rounded"
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="py-3 px-4 text-purple-400">Canción</th>
                      <th className="py-3 px-4 text-purple-400">Artista</th>
                      <th className="py-3 px-4 text-right text-purple-400">Puntuación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.mejores_canciones.map((item, index) => (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{item.titulo}</td>
                        <td className="py-3 px-4 text-gray-300">{item.artista}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            item.puntuacion > 0.7 ? 'bg-green-600/50 text-green-200' :
                            item.puntuacion > 0.4 ? 'bg-yellow-600/50 text-yellow-200' :
                            'bg-red-600/50 text-red-200'
                          }`}>
                            {item.puntuacion.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Distribución de sentimientos */}
          {(activeTab === 'general' || activeTab === 'sentimientos') && (
            <div className={cardStyle}>
              <h2 className="text-2xl font-bold text-white mb-4">Distribución de Sentimientos</h2>
              <div className="bg-black/20 rounded-xl p-4 mb-6 border border-purple-500/30">
                <img 
                  src={`data:image/png;base64,${data.sentiment_dist}`} 
                  alt="Distribución sentimientos"
                  className="w-full h-auto rounded"
                />
              </div>
              
              <div className="space-y-3">
                {data.distribucion_sentimientos.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className={`w-4 h-4 rounded-full mr-3 shadow-lg ${
                          item.etiqueta === 'positivo' ? 'bg-green-500' :
                          item.etiqueta === 'neutral' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      ></div>
                      <span className="text-white capitalize font-medium">{item.etiqueta}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-pink-400 font-bold text-lg">{item.cantidad}</span>
                      <span className="text-gray-400 text-sm ml-2">(Avg: {item.puntuacion_promedio.toFixed(2)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas adicionales */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${cardStyle} text-center`}>
            <h3 className="text-lg font-medium text-purple-400 mb-2">Total de Reseñas</h3>
            <p className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {data.distribucion_sentimientos.reduce((acc, curr) => acc + curr.cantidad, 0)}
            </p>
          </div>
          
          <div className={`${cardStyle} text-center`}>
            <h3 className="text-lg font-medium text-purple-400 mb-2">Mejor Puntuación</h3>
            <p className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {Math.max(...data.mejores_canciones.map(item => item.puntuacion)).toFixed(2)}
            </p>
          </div>
          
          <div className={`${cardStyle}`}>
            <h3 className="text-lg font-medium text-purple-400 mb-2 text-center">Artista Más Reseñado</h3>
            <p className="text-2xl font-bold text-white truncate text-center pt-2">
              {data.mejores_canciones.reduce((prev, current) => 
                (prev.reseñas > current.reseñas) ? prev : current
              ).artista}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalisisResenas;