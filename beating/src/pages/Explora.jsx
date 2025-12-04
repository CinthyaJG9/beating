import React, { useEffect, useState } from "react";
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function Explora() {
  const [positiveSongs, setPositiveSongs] = useState([]);
  const [negativeSongs, setNegativeSongs] = useState([]);
  const [neutralSongs, setNeutralSongs] = useState([]);
  const [positiveAlbums, setPositiveAlbums] = useState([]);
  const [negativeAlbums, setNegativeAlbums] = useState([]);
  const [neutralAlbums, setNeutralAlbums] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("positive");

  const navigate = useNavigate();

  // ---------------------------
  // Fetch inicial
  // ---------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const endpoints = [
          axios.get("http://localhost:5000/api/top_songs?sentiment=positive&limit=10"),
          axios.get("http://localhost:5000/api/top_songs?sentiment=negative&limit=10"),
          axios.get("http://localhost:5000/api/top_songs?sentiment=neutral&limit=10"),
          axios.get("http://localhost:5000/api/top_albums?sentiment=positive&limit=10"),
          axios.get("http://localhost:5000/api/top_albums?sentiment=negative&limit=10"),
          axios.get("http://localhost:5000/api/top_albums?sentiment=neutral&limit=10"),
        ];

        const [
          ps, ns, neus, pa, na, neua
        ] = await Promise.all(endpoints);

        setPositiveSongs(ps.data || []);
        setNegativeSongs(ns.data || []);
        setNeutralSongs(neus.data || []);
        setPositiveAlbums(pa.data || []);
        setNegativeAlbums(na.data || []);
        setNeutralAlbums(neua.data || []);

      } catch (err) {
        setError("Error al cargar los datos. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ---------------------------
  // Helpers
  // ---------------------------
  const selectByFilter = (positive, negative, neutral) => {
    if (activeFilter === "positive") return positive;
    if (activeFilter === "negative") return negative;
    return neutral;
  };

  const currentSongs = selectByFilter(positiveSongs, negativeSongs, neutralSongs);
  const currentAlbums = selectByFilter(positiveAlbums, negativeAlbums, neutralAlbums);

  const stats = {
    positive: positiveSongs.length + positiveAlbums.length,
    negative: negativeSongs.length + negativeAlbums.length,
    neutral: neutralSongs.length + neutralAlbums.length,
  };

  const getReviewStyles = (type, sentiment) => {
    const base = "rounded-lg p-3 border-l-4 font-medium ";
    if (type !== "real") return base + "bg-purple-900/40 border-purple-500 text-purple-50 shadow-lg";

    const styles = {
      positivo: "bg-green-900/40 border-green-500 text-green-50 shadow-lg",
      negativo: "bg-red-900/40 border-red-500 text-red-50 shadow-lg",
      neutral:  "bg-blue-900/40 border-blue-400 text-blue-50 shadow-lg",
    };
    return base + (styles[sentiment] || styles.neutral);
  };

  const getReviewMeta = (type, sentiment) => {
    if (type !== "real") {
      return {
        icon: "★",
        color: "text-purple-200",
        badge: "bg-purple-800/60 text-purple-100 border border-purple-600",
        label: "General",
      };
    }

    const meta = {
      positivo: {
        icon: "⭐",
        color: "text-yellow-300",
        badge: "bg-green-800/60 text-green-100 border border-green-600",
        label: "Positivo",
      },
      negativo: {
        icon: "💬",
        color: "text-red-200",
        badge: "bg-red-800/60 text-red-100 border border-red-600",
        label: "Negativo",
      },
      neutral: {
        icon: "📝",
        color: "text-blue-200",
        badge: "bg-blue-800/60 text-blue-100 border-blue-600",
        label: "Neutral",
      }
    };
    return meta[sentiment] || meta.neutral;
  };

  const handleNavigateReviews = (song) => {
    navigate(`/resenas?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`);
  };

  const handleItemClick = (type, item) => {
    console.log(`${type} clickeado:`, item);
  };

  // ---------------------------
  // Loading / Error
  // ---------------------------
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl">Cargando contenido...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        <p className="text-xl text-red-400">{error}</p>
      </main>
    );
  }

  // ---------------------------
  // Render principal
  // ---------------------------
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0e0e10] to-[#020107] text-white relative overflow-hidden">

      {/* Glow de fondo */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 py-10 relative z-10">

        {/* Filtros */}
        <section className="mb-12">
          <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-700 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-4">Explorar por Sentimiento</h3>

            <div className="flex flex-wrap gap-4">
              <Button
                onClick={() => setActiveFilter("positive")}
                className={`px-6 py-3 text-lg font-semibold ${
                  activeFilter === "positive"
                    ? "bg-green-600 text-white shadow-lg shadow-green-500/25"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                👍 Top 10 Positivas ({stats.positive})
              </Button>

              <Button
                onClick={() => setActiveFilter("negative")}
                className={`px-6 py-3 text-lg font-semibold ${
                  activeFilter === "negative"
                    ? "bg-red-600 text-white shadow-lg shadow-red-500/25"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                👎 Top 10 Negativas ({stats.negative})
              </Button>

              <Button
                onClick={() => setActiveFilter("neutral")}
                className={`px-6 py-3 text-lg font-semibold ${
                  activeFilter === "neutral"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                💬 Top 10 Neutrales ({stats.neutral})
              </Button>
            </div>
          </div>
        </section>

        {/* ----------------------- */}
        {/* S E C C I Ó N   S O N G S */}
        {/* ----------------------- */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-5xl font-bold">
              {activeFilter === "positive" && "🎵 Canciones Más Positivas"}
              {activeFilter === "negative" && "🎵 Canciones Más Negativas"}
              {activeFilter === "neutral"  && "🎵 Canciones Más Neutrales"}
            </h2>
            <span className="text-sm bg-purple-600 px-3 py-1 rounded-full">
              {currentSongs.length} canciones
            </span>
          </div>

          {currentSongs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentSongs.map((song, index) => {
                const meta = getReviewMeta(song.review_type, song.review_sentiment);

                return (
                  <Card
                    key={song.id}
                    className="bg-gradient-to-b from-purple-900/30 to-blue-900/20 rounded-2xl 
                    hover:scale-105 transition-all cursor-pointer border border-purple-500/30 shadow-xl backdrop-blur-sm"
                    onClick={() => handleItemClick("canción", song)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">

                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700 shadow-lg">
                          {song.cover_url ? (
                            <img alt={song.title} src={song.cover_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
                              <span className="text-xl">♪</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold line-clamp-2">{song.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{song.artist}</p>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold text-sm">
                              ★ {song.rating?.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({song.total_reviews} reseñas)
                            </span>
                          </div>
                        </div>
                      </div>

                      {song.review && (
                        <div className={getReviewStyles(song.review_type, song.review_sentiment)}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`text-base ${meta.color}`}>{meta.icon}</span>
                            <p className="text-xs leading-relaxed flex-1">"{song.review}"</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full ${meta.badge}`}>
                              {song.review_highlight}
                            </span>

                            {song.review_type === "real" && (
                              <span className="text-xs text-gray-300">{meta.label}</span>
                            )}
                          </div>
                        </div>
                      )}

                      <Button
                        className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 
                        hover:to-pink-700 text-white w-full text-sm shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateReviews(song);
                        }}
                      >
                        👁️ Ver Reseñas
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <p className="text-2xl text-gray-400 mb-6">
                {activeFilter === "positive" && "Aún no hay canciones positivas"}
                {activeFilter === "negative" && "Aún no hay canciones negativas"}
                {activeFilter === "neutral"  && "Aún no hay canciones neutrales"}
              </p>

              <Button
                onClick={() => navigate("/resenas")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 
                hover:to-pink-700 text-lg px-8 py-3 text-white shadow-lg"
              >
                ✍️ ¡Sé el primero en reseñar!
              </Button>
            </div>
          )}
        </section>

        {/* ----------------------- */}
        {/* S E C C I Ó N   Á L B U M S */}
        {/* ----------------------- */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-5xl font-bold">
              {activeFilter === "positive" && "💿 Álbumes Más Positivos"}
              {activeFilter === "negative" && "💿 Álbumes Más Negativos"}
              {activeFilter === "neutral"  && "💿 Álbumes Más Neutrales"}
            </h2>

            <span className="text-sm bg-pink-600 px-3 py-1 rounded-full">
              {currentAlbums.length} álbumes
            </span>
          </div>

          {currentAlbums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentAlbums.map((album, index) => {
                const meta = getReviewMeta(album.review_type, album.review_sentiment);

                return (
                  <Card
                    key={album.id}
                    className="bg-gradient-to-b from-pink-900/30 to-purple-900/20 rounded-2xl 
                    hover:scale-105 transition-all cursor-pointer border border-pink-500/30 shadow-xl backdrop-blur-sm"
                    onClick={() => handleItemClick("álbum", album)}
                  >
                    <CardContent className="p-5 flex flex-col h-full">

                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white 
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        #{index + 1}
                      </div>

                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-700 shadow-lg">
                          {album.cover_url ? (
                            <img alt={album.title} src={album.cover_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-purple-500">
                              <span className="text-xl">💿</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold line-clamp-2">{album.title}</h3>
                          <p className="text-sm text-gray-300 line-clamp-1">{album.artist}</p>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400 font-semibold text-sm">
                              ★ {album.rating?.toFixed(1) || "0.0"}
                            </span>
                            <span className="text-xs text-gray-400">({album.total_reviews} reseñas)</span>
                          </div>
                        </div>
                      </div>

                      {album.review && (
                        <div className={getReviewStyles(album.review_type, album.review_sentiment)}>
                          <div className="flex items-start gap-2 mb-2">
                            <span className={`text-base ${meta.color}`}>{meta.icon}</span>
                            <p className="text-xs leading-relaxed flex-1">"{album.review}"</p>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full ${meta.badge}`}>
                              {album.review_highlight}
                            </span>

                            {album.review_type === "real" && (
                              <span className="text-xs text-gray-300">{meta.label}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-pink-500/10 rounded-2xl border border-pink-500/20">
              <p className="text-2xl text-gray-400 mb-6">
                {activeFilter === "positive" && "Aún no hay álbumes positivos"}
                {activeFilter === "negative" && "Aún no hay álbumes negativos"}
                {activeFilter === "neutral"  && "Aún no hay álbumes neutrales"}
              </p>

              <Button
                onClick={() => navigate("/resenas")}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 
                hover:to-purple-700 text-lg px-8 py-3 text-white shadow-lg"
              >
                ✍️ ¡Sé el primero en reseñar!
              </Button>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
