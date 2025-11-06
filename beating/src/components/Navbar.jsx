import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./../components/ui/navigation-menu";
import { Button } from "./../components/ui/button";
import React, { useState } from "react"; 
import { useNavigate, useLocation } from "react-router-dom"; 
import { useAuth } from '../pages/AuthContext.jsx';
import Login from '../pages/Login.jsx'; 
import Register from '../pages/Register.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  
  // 👇 CORREGIDO: Usar isActive en lugar de active para el estilo
  const getNavLinkClass = (path) => {
    const baseStyles = "text-lg text-purple-300 hover:text-white transition-colors duration-200";
    const isActive = location.pathname === path;
    
    return isActive 
      ? `${baseStyles} text-white font-medium border-b-2 border-pink-400 pb-1`
      : baseStyles;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  return (
    <>
      <header className="bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          
          <h1
            onClick={() => navigate("/")}
            className="cursor-pointer text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Beating
          </h1>

          <NavigationMenu>
            <NavigationMenuList className="flex items-center gap-8">
              
              {/* 👇 CORREGIDO: Eliminar el atributo active y usar className condicional */}
              <NavigationMenuItem>
                  <NavigationMenuLink 
                    to="/"
                    className={getNavLinkClass('/')} // 👈 Solo pasar className
                  >
                    Inicio
                  </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                  <NavigationMenuLink 
                    to="/canciones"
                    className={getNavLinkClass('/canciones')}
                  >
                    Canciones
                  </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                  <NavigationMenuLink 
                    to="/albumes"
                    className={getNavLinkClass('/albumes')}
                  >
                    Álbumes
                  </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Lógica de botones dinámicos */}
              {isAuthenticated ? (
                <>
                  <NavigationMenuItem>
                      <NavigationMenuLink 
                        to="/profileB"
                        className={getNavLinkClass('/profileB')}
                      >
                        Hola, {user?.username || 'Usuario'}
                      </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                      onClick={handleLogout}
                    >
                      Cerrar Sesión
                    </Button>
                  </NavigationMenuItem>
                </>
              ) : (
                <>
                  <NavigationMenuItem>
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                      onClick={() => setShowLogin(true)}
                    >
                      Iniciar Sesión
                    </Button>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => setShowRegister(true)}
                    >
                      Registrarse
                    </Button>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </header>

      {/* Modales */}
      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </>
  );
}