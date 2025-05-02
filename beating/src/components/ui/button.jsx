// src/components/ui/button.jsx
import React from "react";

export function Button({
  children,
  className = "",
  variant = "default",
  ...props
}) {
  const base = "px-4 py-2 rounded-md font-medium transition-colors";

  const variants = {
    default: "bg-purple-600 text-white hover:bg-purple-700",
    outline: "border border-white text-white hover:bg-white/10",
    ghost: "text-white hover:bg-white/10",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
