import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./pages/AuthContext"; 
import Navbar from "./components/Navbar"; 
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register"; 
import Resenas from "./pages/Resenas";
import AnalisisResenas from "./pages/AnalisisResenas";
import Explora from "./pages/Explora";
import AuthRequired from "./pages/AuthRequired";
import ProfileB from "./pages/ProfileB";
import Canciones from "./pages/Canciones";
import Albumes from "./pages/Albumes";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Navbar ahora tendrá acceso a useAuth() */}
        <Navbar /> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/resenas" element={<Resenas />} />
          <Route path="/analisis" element={<AnalisisResenas />} />
          <Route path="/explora" element={<Explora />} />
          <Route path="/auth-required" element={<AuthRequired />} />
          <Route path="/canciones" element={<Canciones />} />
          <Route path="/albumes" element={<Albumes />} />
          {/* Rutas Privadas (Protegidas) */}
          <Route 
            path="/profileB" element={
              <AuthRequired>
                <ProfileB />
              </AuthRequired>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
