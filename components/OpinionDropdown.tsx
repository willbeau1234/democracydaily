'use client';

import React, { useState, useEffect } from 'react';

interface OpinionDropdownProps {
  className?: string;
  sectionName?: string;
  currentPage?: string;
}

export default function OpinionDropdown({ 
  className = "", 
  sectionName = "Opinion Section",
  currentPage = ""
}: OpinionDropdownProps) {
  const [isOpinionDropdownOpen, setIsOpinionDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getMenuItems = () => {
    const allItems = [
      { href: "/", label: "🏠 Home", key: "home" },
      { href: "/DIY", label: "📰 DIY", key: "DIY" },
      { href: "/profile", label: "👤 Profile", key: "profile" },
      { href: "/Friends", label: "🤝 Friends", key: "Friends" }
    ];

    return allItems.filter(item => item.key !== currentPage);
  };

  if (!isMounted) {
    return (
      <div className={`relative ${className}`}>
        <span className="flex items-center gap-1 font-serif">
          {sectionName}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpinionDropdownOpen(!isOpinionDropdownOpen)}
        className="flex items-center gap-1 hover:text-black transition-colors font-serif"
      >
        {sectionName}
        <svg 
          className={`w-3 h-3 transition-transform ${isOpinionDropdownOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpinionDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-10">
          {getMenuItems().map((item) => (
            <div key={item.key} className="py-2">
              <a href={item.href} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-serif">
                {item.label}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}