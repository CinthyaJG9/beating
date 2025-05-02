// src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card text-card-foreground py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <p className="text-muted-foreground text-center md:text-left">
          © {new Date().getFullYear()} Beating. Todos los derechos reservados.
        </p>
        <div className="flex gap-4">
          <a
            href="#"
            className="hover:text-foreground transition-colors duration-200"
          >
            Aviso de privacidad
          </a>
          <a
            href="#"
            className="hover:text-foreground transition-colors duration-200"
          >
            Términos de uso
          </a>
        </div>
      </div>
    </footer>
  );
}
