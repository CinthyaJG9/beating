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
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#e900ff] mx-auto mb-4"></div>
        <p className="text-2xl text-white">Cargando análisis...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-8 bg-[#140a14b0] rounded-lg max-w-md">
        <h2 className="text-2xl font-bold text-[#e900ff] mb-4">Error</h2>
        <p className="text-white mb-6">{error}</p>
        <Button 
          onClick={() => navigate(-1)} 
          className="bg-[#e900ff] hover:bg-[#c100e0] text-white"
        >
          Volver atrás
        </Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#e900ff] to-[#ff7b00] bg-clip-text text-transparent mb-2">
            Análisis de Reseñas
          </h1>
          <p className="text-gray-300">Descubre insights sobre las opiniones de los usuarios</p>
        </div>
        
        <Button 
          onClick={() => navigate(-1)} 
          variant="outline" 
          className="border-[#e900ff] text-[#e900ff] hover:bg-[#140a14b0]"
        >
          Volver atrás
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-8 bg-[#140a14b0] rounded-lg overflow-hidden">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium ${activeTab === 'general' ? 'text-[#e900ff] border-b-2 border-[#e900ff]' : 'text-gray-400 hover:text-white'}`}
          >
            Visión General
          </button>
          <button
            onClick={() => setActiveTab('canciones')}
            className={`px-6 py-3 font-medium ${activeTab === 'canciones' ? 'text-[#e900ff] border-b-2 border-[#e900ff]' : 'text-gray-400 hover:text-white'}`}
          >
            Top Canciones
          </button>
          <button
            onClick={() => setActiveTab('sentimientos')}
            className={`px-6 py-3 font-medium ${activeTab === 'sentimientos' ? 'text-[#e900ff] border-b-2 border-[#e900ff]' : 'text-gray-400 hover:text-white'}`}
          >
            Distribución
          </button>
        </div>
      </div>

      {/* Contenido de las pestañas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nube de palabras */}
        {activeTab === 'general' && (
          <div className="bg-[#140a14b0] rounded-xl p-6 shadow-lg border border-gray-800 lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-4">Palabras más usadas en reseñas positivas</h2>
            <div className="bg-black rounded-lg p-4">
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
          <div className="bg-[#140a14b0] rounded-xl p-6 shadow-lg border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Top 10 Canciones Mejor Calificadas</h2>
            <div className="bg-black rounded-lg p-4 mb-4">
              <img 
                src={`data:image/png;base64,${data.top_songs}`} 
                alt="Top canciones"
                className="w-full h-auto rounded"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-[#e900ff]">Canción</th>
                    <th className="text-left py-3 px-4 text-[#e900ff]">Artista</th>
                    <th className="text-right py-3 px-4 text-[#e900ff]">Puntuación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.mejores_canciones.map((item, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-[#1e0e1e]">
                      <td className="py-3 px-4 text-white">{item.titulo}</td>
                      <td className="py-3 px-4 text-gray-300">{item.artista}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          item.puntuacion > 0.7 ? 'bg-green-900 text-green-300' :
                          item.puntuacion > 0.4 ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
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
          <div className="bg-[#140a14b0] rounded-xl p-6 shadow-lg border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-4">Distribución de Sentimientos</h2>
            <div className="bg-black rounded-lg p-4 mb-6">
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
                      className={`w-4 h-4 rounded-full mr-3 ${
                        item.etiqueta === 'positivo' ? 'bg-green-500' :
                        item.etiqueta === 'neutral' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                    ></div>
                    <span className="text-white capitalize">{item.etiqueta}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-medium">{item.cantidad}</span>
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
        <div className="bg-[#140a14b0] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-medium text-[#e900ff] mb-2">Total de Reseñas</h3>
          <p className="text-3xl font-bold text-white">
            {data.distribucion_sentimientos.reduce((acc, curr) => acc + curr.cantidad, 0)}
          </p>
        </div>
        
        <div className="bg-[#140a14b0] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-medium text-[#e900ff] mb-2">Mejor Puntuación</h3>
          <p className="text-3xl font-bold text-white">
            {Math.max(...data.mejores_canciones.map(item => item.puntuacion)).toFixed(2)}
          </p>
        </div>
        
        <div className="bg-[#140a14b0] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-medium text-[#e900ff] mb-2">Artista Más Reseñado</h3>
          <p className="text-2xl font-bold text-white truncate">
            {data.mejores_canciones.reduce((prev, current) => 
              (prev.reseñas > current.reseñas) ? prev : current
            ).artista}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalisisResenas;