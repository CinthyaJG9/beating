import React, { useState, useEffect } from "react";
import axios from 'axios';
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../pages/AuthContext"; 
import Login from "./Login"; 

const baseCardStyle = "bg-gradient-to-b from-purple-500 to-blue-500 rounded-xl shadow-xl";

const HomeWordCloudContainer = () => {
    const [wordcloudImage, setWordcloudImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWordCloud = async () => {
            try {
                // Llama al endpoint de análisis (devuelve BASE64)
                const response = await axios.get('http://localhost:5000/analisis-resenas'); 
                
                if (response.data && response.data.wordcloud) {
                    // Usa la imagen Base64
                    setWordcloudImage(`data:image/png;base64,${response.data.wordcloud}`);
                } else {
                    setError("Nube de palabras no disponible.");
                }
            } catch (err) {
                console.error("Error fetching wordcloud:", err);
                setError("Error al cargar datos del servidor.");
            } finally {
                setLoading(false);
            }
        };

        fetchWordCloud();
    }, []);

    // Manejo de carga
    if (loading) {
        return (
            // 🛑 APLICAR DIMENSIONES AL PADRE: w-full h-full
            <div className={`w-full h-full ${baseCardStyle} flex items-center justify-center`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
            </div>
        );
    }
    
    // Fallback si hay error o no hay imagen
    if (error || !wordcloudImage) {
        return (
            <div className={`w-full h-full text-center ${baseCardStyle} flex flex-col items-center justify-center p-4`}>
                <p className="text-sm font-semibold text-white/90">Análisis No Disponible</p>
                <p className="text-xs text-white/70">Aún no hay suficientes reseñas.</p>
            </div>
        );
    }

    return (
        <div className={`w-full h-full ${baseCardStyle} overflow-hidden`}>
            <div className="p-0 h-full flex items-center justify-center bg-black/50">
                <img
                    src={wordcloudImage}
                    alt="Nube de palabras de la comunidad"
                    className="w-full h-full object-contain" 
                />
            </div>
        </div>
    );
};

export default function Home() {
	const [showLogin, setShowLogin] = useState(false);
	const navigate = useNavigate();
	const { isAuthenticated } = useAuth(); 

	const handleCrearResena = () => {
		if (!isAuthenticated) {
			setShowLogin(true);
		} else {
			navigate("/resenas");
		}
	};

	return (
		<>
			<main className="min-h-screen bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] relative">
				<div className="container mx-auto px-4 py-6">
					{/* Contenido principal */}
					<div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-0 pb-10">
						<div className="max-w-md">
							<h2 className="text-5xl font-bold text-white mb-2">
								Donde tus emociones{" "}
								<span className="text-purple-300">se convierten</span> en música
							</h2>
							{/* Se mantuvo mb-6 */}
							<p className="text-sm text-gray-400 mb-6">
								Analizamos tus sentimientos en reseñas musicales para crear
								playlists que realmente conecten contigo.
							</p>

							<div className="flex gap-4">
								<Button
									onClick={() => navigate('/comunidad')}
									className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 text-xl font-bold rounded-xl shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105"
								>
									Comunidad
								</Button>
							</div>
						</div>

						{/* INTEGRACIÓN DEL COMPONENTE DE CARGA */}
						<div className="relative w-[32rem] h-[28rem] flex items-center justify-center">
							<div className="absolute right-0 top-0 z-10 hover:rotate-6 transition-transform duration-600">
								<HomeWordCloudContainer />
							</div>
						</div>
					</div>
				</div>
			</main>

			{/*  Modal de Login que se muestra si no está autenticado */}
			{showLogin && (
				<Login 
					onClose={() => setShowLogin(false)}
					onSwitchToRegister={() => {
						setShowLogin(false);
					}}
				/>
			)}
		</>
	);
}