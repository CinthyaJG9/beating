import React, { createContext, useContext, useState, useEffect } from 'react';
//import jwtDecode from 'jwt-decode'; // Necesario para decodificar el token

// Crea el Contexto
const AuthContext = createContext();

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error al parsear JWT:", error);
    return null;
  }
}

// Componente Proveedor
export const AuthProvider = ({ children }) => {
  // isAuthenticated: Estado principal para saber si el usuario está logueado
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // userId: Guarda el ID del usuario logueado
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Función principal para chequear el token al cargar
  const loadUserFromToken = (token) => {
    try {
      // 🛑 CAMBIO: Usamos la función manual
      const decoded = parseJwt(token); 

      if (!decoded) {
        throw new Error("Payload nulo o inválido");
      }

      // Comprobar si el token ha expirado
      if (decoded.exp * 1000 > Date.now()) {
        setIsAuthenticated(true);
        setUser({
          id: decoded.user_id, // Asegúrate que esta clave coincida con tu backend
          username: decoded.username 
        });
        localStorage.setItem('token', token);
        return true;
      }
    } catch (error) {
      console.error("Error al cargar token:", error);
    }
    // Si falla o expira, limpiar
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    return false;
  };
  
  // Efecto que corre una vez al montar y se suscribe a los cambios
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUserFromToken(token);
    }
    setIsLoading(false); // Terminamos de cargar
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setUser(userData); // Guardar los datos del usuario (ej: {id, username})
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (isLoading) {
    // Muestra un spinner o nada mientras carga el token
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-[#1e1626]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Funciones y estados que serán accesibles para toda la app
  const value = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
