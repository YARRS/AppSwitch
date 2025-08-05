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

  // Vallmark logo image URL
  const logoImageUrl = "https://customer-assets.emergentagent.com/job_9beb3a4a-9863-4b1a-92c6-6036151fe326/artifacts/4ib9hexg_Vallmark_Log0_.jpg";

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Vallmark Logo Image */}
      <div className={`${sizeClasses[size]} flex items-center justify-center`}>
        <img
          src={logoImageUrl}
          alt="Vallmark Cards & Gift"
          className={`${sizeClasses[size]} object-contain rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300`}
          onError={(e) => {
            // Fallback to text logo if image fails to load
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback text logo (hidden by default) */}
        <div 
          className={`${sizeClasses[size]} bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg`}
          style={{ display: 'none' }}
        >
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