import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "./../components/ui/navigation-menu";
  import { Button } from "./../components/ui/button";
  import React from "react";
  
  export default function Navbar() {
    const navItems = [
      { name: "Inicio", active: false },
      { name: "Canciones", active: true },
      { name: "Discos / Albums", active: false },
      { name: "Acerca de", active: false },
        { name: "Contacto", active: false },

    ];
  
    return (
      <header className="flex justify-between items-center py-4 px-6 container mx-auto">
        {/* Logo */}
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-orange-300 bg-clip-text text-transparent">
          Beating
        </h1>
  
        {/* Navegación */}
        <div className="flex items-center gap-8">
          <NavigationMenu>
            <NavigationMenuList className="flex gap-8">
              {navItems.map((item) => (
                <NavigationMenuItem key={item.name}>
                  <NavigationMenuLink
                    className={`text-lg ${item.active ? "text-white font-medium" : "text-purple-300"}`}
                  >
                    {item.name}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
  
          {/* Botón de sesión */}
          <Button variant="outline" className="ml-8 border-white text-white">
            Iniciar Sesión
          </Button>
        </div>
      </header>
    );
  }
  