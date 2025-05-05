// src/components/ui/dialog.jsx
import React from "react";

export function Dialog({ children, defaultOpen = false }) {
  // Simula apertura del diálogo si defaultOpen es true
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }) {
  return (
    <div
      className={`relative bg-black border border-gray-800 text-white rounded-lg shadow-lg p-6 w-full max-w-md ${className}`}
    >
      {children}
    </div>
  );
}

export function DialogClose({ children, className = "", ...props }) {
  return (
    <button
      className={`absolute top-2 right-2 text-gray-400 hover:text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
