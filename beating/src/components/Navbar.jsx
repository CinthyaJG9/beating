import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./../components/ui/navigation-menu";
import { Button } from "./../components/ui/button";
import React, { useState, useEffect } from "react"; 
import { Link, useNavigate, useLocation } from "react-router-dom"; 
import { useAuth } from '../pages/AuthContext.jsx';
import Login from '../pages/Login.jsx'; 
import Register from '../pages/Register.jsx';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const navLinkStyles = "text-lg text-purple-300 hover:text-white data-[active]:text-white data-[active]:font-medium data-[active]:border-b-2 data-[active]:border-pink-400 data-[active]:pb-1";

  const handleLogout = () => {
    logout();
    navigate('/'); // Opcional: redirigir al inicio después de cerrar sesión
  };

  /*const navItems = [
    { name: "Inicio", path: "/", active: false }, 
    { name: "Canciones", path: "/canciones", active: true }, 
    { name: "Discos / Albums", path: "/albumes", active: false }, 
    { name: "Acerca de", path: "/acerca-de", active: false }, 
    { name: "Contacto", path: "/contacto", active: false },
  ];

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };

    window.addEventListener('authChange', handleAuthChange);

    return () => {
      window.removeEventListener('authChange', handleAuthChange);
    };
  }, []); 

  const handleAuthClick = () => {
    if (isAuthenticated) {
      navigate('/profileB');
    } else {
      navigate('/login');
    }
  };*/
  
  return (
    <>
      {/* Añadimos el fondo oscuro al <header> (para que sea full-width)
        y centramos el contenido con un 'div' (para que coincida con el diseño anterior)
      */}
      <header className="bg-[#1e1626] [background:radial-gradient(50%_50%_at_50%_50%,rgba(40,20,50,1)_0%,rgba(20,10,30,1)_100%)] py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          
          <h1
            onClick={() => navigate("/")}
            className="cursor-pointer text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Beating
          </h1>

          {/* 5. Corrección de Navegación (para evitar <a> anidados) */}
          <NavigationMenu>
            <NavigationMenuList className="flex items-center gap-8">
              
              {/* Links de Navegación */}
              <NavigationMenuItem>
                  <NavigationMenuLink to="/"
                    className={navLinkStyles} 
                    active={location.pathname === '/'}
                  >
                    Inicio
                  </NavigationMenuLink>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                  <NavigationMenuLink to="/canciones"
                    className={navLinkStyles} 
                    active={location.pathname === '/canciones'}
                  >
                    Canciones
                  </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                  <NavigationMenuLink to="/albumes"
                    className={navLinkStyles} 
                    active={location.pathname === '/albumes'}
                  >
                    Álbumes
                  </NavigationMenuLink>
              </NavigationMenuItem>

              {/* Lógica de botones dinámicos */}
              {isAuthenticated ? (
                <>
                  <NavigationMenuItem>
                      <NavigationMenuLink to="/profileB"
                        className={navLinkStyles} 
                        active={location.pathname === '/profileB'}
                      >
                        Hola, {user.username}
                      </NavigationMenuLink>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button
                      variant="outline"
                      className="border-white text-white"
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
                      className="border-white text-white"
                      onClick={() => setShowLogin(true)}
                    >
                      Iniciar Sesión
                    </Button>
                  </NavigationMenuItem>
                  
                  <NavigationMenuItem>
                    <Button
                      className="bg-purple-600 hover:bg-purple-700"
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

      {/* Lógica de Modales (movida aquí desde Home.jsx) */}
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