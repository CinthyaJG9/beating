// components/Tab.jsx
import React from 'react';

export function Tab({ 
  children, 
  isActive = false, //recibes
  disabled = false, 
  onClick, 
  className = '',
  ...props 
}) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`px-6 py-3 text-lg font-medium rounded-t-lg transition-all duration-200 focus:outline-none ${
        isActive //  'active' por 'isActive'
          ? 'text-[#e900ff] border-b-2 border-[#e900ff] bg-[#140a14b0]'
          : disabled
          ? 'text-gray-500 cursor-not-allowed'
          : 'text-gray-300 hover:text-[#e900ff] hover:bg-[#140a14b0]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}