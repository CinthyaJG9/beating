import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register"; 
import Resenas from "./pages/Resenas";
import AnalisisResenas from "./pages/AnalisisResenas";
import Explora from "./pages/Explora";

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

      </Routes>
    </Router>
  );
}
