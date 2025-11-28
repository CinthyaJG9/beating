import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // 👇 NUEVO: Estados para persistir la selección durante el login
  const [pendingSelection, setPendingSelection] = useState(null);
  const [pendingRedirect, setPendingRedirect] = useState(null);

  // Función principal para chequear el token al cargar
  const loadUserFromToken = (token) => {
    try {
      const decoded = parseJwt(token); 

      if (!decoded) {
        throw new Error("Payload nulo o inválido");
      }

      // Comprobar si el token ha expirado
      if (decoded.exp * 1000 > Date.now()) {
        const userData = {
          id: decoded.user_id, // Asume que el backend usa 'user_id'
          username: decoded.username 
        };
        setIsAuthenticated(true);
        setUser(userData);
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
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    // 👇 Limpiar selecciones pendientes al hacer logout
    setPendingSelection(null);
    setPendingRedirect(null);
  };

  // 👇 NUEVO: Función para guardar selección antes del login
  const savePendingSelection = (selection, redirectPath = '/resenas') => {
    console.log('💾 Guardando selección pendiente:', selection);
    setPendingSelection(selection);
    setPendingRedirect(redirectPath);
  };

  // 👇 NUEVO: Función para obtener y limpiar la selección pendiente
  const getPendingSelection = () => {
    const selection = pendingSelection;
    const redirect = pendingRedirect;
    console.log('📥 Recuperando selección pendiente:', selection);
    setPendingSelection(null);
    setPendingRedirect(null);
    return { selection, redirect };
  };

  if (isLoading) {
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
    // 👇 Exportar las nuevas funciones
    savePendingSelection,
    getPendingSelection
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