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
import Comunidad from "./pages/Comunidad"
import ProfileOther from "./pages/ProfileOther";

export default function App() {
  return (
    <BrowserRouter>
      {/* 👇 AuthProvider debe envolver todo lo que use useAuth() */}
      <AuthProvider>
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
          <Route path="/profileB" element={<ProfileB /> } />
          <Route path="/comunidad" element={<Comunidad /> } />
          <Route path="/profileOther" element={<ProfileOther /> } />
          <Route path="/perfil/:userId" element={<ProfileOther />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}