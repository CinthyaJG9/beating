// src/pages/Home.jsx
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import Login from "./Login";
import Register from "./Register";

export default function Home() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] relative">
        <div className="container mx-auto px-4 py-6">
          {/* Header con Logo personalizado */}
          <header className="flex justify-between items-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Beating
            </h1>

            {/* Menú de navegación */}
            <nav className="flex items-center gap-8">
              <a href="#" className="text-purple-300 hover:text-white">Inicio</a>
              <a href="#" className="text-white font-medium">Canciones</a>
              <a href="#" className="text-purple-300 hover:text-white">Álbumes</a>
              <Button
                variant="outline"
                className="border-white text-white"
                onClick={() => setShowLogin(true)}
              >
                Iniciar Sesión
              </Button>
            </nav>
          </header>

          {/* Contenido principal */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="max-w-md">
              <h2 className="text-5xl font-bold text-white mb-2">
                Donde tus emociones <span className="text-purple-300">se convierten</span> en música
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                Analizamos tus sentimientos en reseñas musicales para crear playlists que realmente conecten contigo.
              </p>

              <div className="flex gap-4">
                <Button
                  onClick={() => navigate("/explora")}
                  className="bg-gradient-to-r from-blue-400 to-purple-400 hover:opacity-90 text-white px-10 py-6 text-xl rounded-xl"
                >
                  Explorar
                </Button>

                <Button
                  onClick={() => setShowLogin(true)}
                  className="bg-gradient-to-r from-pink-400 to-purple-500 hover:opacity-90 text-white px-10 py-6 text-xl rounded-xl"
                >
                  Crear Reseña
                </Button>
              </div>
            </div>

            {/* Logo visual */}
            <div className="relative w-72 h-80">
              <div className="absolute right-0 top-0 rotate-6 z-10">
                <Card className="w-64 h-72 bg-gradient-to-b from-purple-400 to-blue-400 rounded-xl shadow-xl">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center mb-4">
                      <svg
                        width="80"
                        height="40"
                        viewBox="0 0 120 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <linearGradient
                            id="waveGradient"
                            x1="0"
                            y1="0"
                            x2="120"
                            y2="0"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop offset="0%" stopColor="#9333ea" />
                            <stop offset="100%" stopColor="#ec4899" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 20 Q 10 10, 20 20 Q 30 30, 40 20 Q 50 10, 60 20 Q 70 30, 80 20 Q 90 10, 100 20"
                          stroke="url(#waveGradient)"
                          strokeWidth="4"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <rect x="102" y="17" width="10" height="6" rx="1" fill="#ec4899" />
                        <line x1="112" y1="18" x2="116" y2="18" stroke="#ec4899" strokeWidth="2" />
                        <line x1="112" y1="22" x2="116" y2="22" stroke="#ec4899" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="text-center text-white">
                      <div className="text-xs text-white/70">Mood Detectado:</div>
                      <div className="text-sm font-medium text-white">Melancolía suave 🌧️</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute right-4 top-4 -rotate-3 z-0">
                <Card className="w-64 h-72 bg-gradient-to-b from-purple-300 to-blue-300 rounded-xl shadow-lg opacity-70">
                  <CardContent className="flex flex-col items-center justify-center h-full p-6">
                    <div className="text-center text-white">
                      <div className="text-xs text-white/70">Sugerencia de playlist:</div>
                      <div className="text-sm font-medium text-white">"Reflexiones nocturnas"</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modales superpuestos */}
      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)} 
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}
      
      {showRegister && (
        <Register 
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </>
  );
}