// src/components/ui/navigation-menu.jsx
import React from "react";
import { Link } from "react-router-dom"; 

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

export function NavigationMenuLink({ children, className = "", to = "#", passHref, legacyBehavior, ...props }) {
  return (
    <Link
      to={to}
      className={`navigation-menu-link cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
