// src/components/ui/navigation-menu.jsx
import React from "react";

export function NavigationMenu({ children, className = "" }) {
  return (
    <nav className={`navigation-menu ${className}`}>
      {children}
    </nav>
  );
}

export function NavigationMenuList({ children, className = "" }) {
  return (
    <ul className={`navigation-menu-list flex gap-4 ${className}`}>
      {children}
    </ul>
  );
}

export function NavigationMenuItem({ children }) {
  return <li className="navigation-menu-item">{children}</li>;
}

export function NavigationMenuLink({ children, className = "" }) {
  return (
    <a
      href="#"
      className={`navigation-menu-link cursor-pointer ${className}`}
    >
      {children}
    </a>
  );
}
