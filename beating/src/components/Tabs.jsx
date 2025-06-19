// components/Tabs.jsx
import React from 'react';

export function Tabs({ children, className = '' }) {
  return (
    <div className={`flex border-b border-gray-700 ${className}`}>
      <div className="flex space-x-1 overflow-x-auto">
        {React.Children.map(children, (child) => {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} flex-shrink-0`
          });
        })}
      </div>
    </div>
  );
}