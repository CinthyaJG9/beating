import React, { createContext, useContext, useState, useEffect } from 'react';

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

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [pendingRedirect, setPendingRedirect] = useState(null);

  const loadUserFromToken = (token) => {
    try {
      const decoded = parseJwt(token);
      if (!decoded) throw new Error("Payload inválido");

      if (decoded.exp * 1000 > Date.now()) {
        const userData = {
          id: decoded.user_id,
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

    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('token');
    return false;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) loadUserFromToken(token);
    setIsLoading(false);
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
    setPendingSelection(null);
    setPendingRedirect(null);
  };

  const savePendingSelection = (selection, redirectPath = '/resenas') => {
    setPendingSelection(selection);
    setPendingRedirect(redirectPath);
  };

  const getPendingSelection = () => {
    const selection = pendingSelection;
    const redirect = pendingRedirect;
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

  const value = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    savePendingSelection,
    getPendingSelection
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  return context;
};