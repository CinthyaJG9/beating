import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register"; 
import Resenas from "./pages/Resenas";
import AnalisisResenas from "./pages/AnalisisResenas";
import Explora from "./pages/Explora";
import AuthRequired from "./pages/AuthRequired";
import Profile from "./pages/Profile";
import Canciones from "./pages/Canciones";
import Albumes from "./pages/Albumes";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/resenas" element={<Resenas />} />
        <Route path="/analisis" element={<AnalisisResenas />} />
        <Route path="/explora" element={<Explora />} />
        <Route path="/auth-required" element={<AuthRequired />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/canciones" element={<Canciones />} />
        <Route path="/albumes" element={<Albumes />} />

      </Routes>
    </Router>
  );
}
