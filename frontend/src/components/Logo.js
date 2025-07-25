import React from 'react';

const Logo = ({ className = "", size = "medium", showText = true }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12", 
    large: "w-16 h-16",
    xl: "w-24 h-24"
  };

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-xl", 
    xl: "text-2xl"
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Vallmark Logo */}
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg`}>
        <div className="text-white font-bold text-center">
          {size === 'small' ? (
            <span className="text-xs">VK</span>
          ) : size === 'medium' ? (
            <span className="text-sm">VK</span>
          ) : (
            <span className="text-base">VK</span>
          )}
        </div>
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={`${textSizeClasses[size]} font-bold text-gray-900 dark:text-white leading-tight`}>
            Vallmark
          </h1>
          <div className="flex items-center space-x-1">
            <span className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 font-medium`}>
              CARDS
            </span>
            <span className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-yellow-600 font-bold`}>
              &
            </span>
            <span className={`${size === 'small' ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400 font-medium`}>
              GIFT
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;