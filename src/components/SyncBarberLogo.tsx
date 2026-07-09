import React from "react";

interface SyncBarberLogoProps {
  className?: string;
  size?: number; // width and height in pixels
  showText?: boolean;
  showTagline?: boolean;
  variant?: "light" | "dark" | "gold";
}

export default function SyncBarberLogo({
  className = "",
  size = 48,
  showText = false,
  showTagline = false,
  variant = "light",
}: SyncBarberLogoProps) {
  // Color configuration based on variant
  const textColors = {
    light: "text-white",
    dark: "text-elegant-bg",
    gold: "text-elegant-gold",
  };

  return (
    <div className={`flex items-center gap-3 ${className}`} id="syncbarber-brand">
      {/* SVG Emblem */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transform transition-transform duration-300 hover:rotate-6 hover:scale-105"
      >
        <defs>
          {/* Main Cyan/Teal Gradient for Arrows and Glow */}
          <linearGradient id="cyanTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>

          {/* Secondary Teal/Blue Gradient for depth */}
          <linearGradient id="tealBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="50%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#115e59" />
          </linearGradient>

          {/* Metallic Scissors Gradient */}
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="30%" stopColor="#cbd5e1" />
            <stop offset="70%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          {/* Glowing Metallic Cyan */}
          <linearGradient id="glowMetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#22d3ee" />
            <stop offset="70%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#044e54" />
          </linearGradient>

          {/* Barber Pole Striped Pattern */}
          <pattern
            id="barberStripes"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="40" height="40" fill="#ffffff" />
            <rect x="0" y="0" width="20" height="40" fill="#3b82f6" />
          </pattern>

          {/* Drop Shadows */}
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* 1. Outer Dark Background Circle */}
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="#0c1524"
          stroke="#1e2e4a"
          strokeWidth="3"
        />

        {/* 2. Micro-circuits/Technology lines in background */}
        <path
          d="M 28 80 A 74 74 0 0 1 172 80 M 35 125 A 72 72 0 0 0 165 125"
          stroke="#162e45"
          strokeWidth="1.5"
          strokeDasharray="4,8"
        />
        <path
          d="M 60 40 L 70 50 M 140 40 L 130 50 M 45 150 L 55 140 M 155 150 L 145 140"
          stroke="#162e45"
          strokeWidth="1.5"
        />
        
        {/* Glow behind center */}
        <circle
          cx="100"
          cy="100"
          r="65"
          fill="#22d3ee"
          fillOpacity="0.08"
          filter="url(#glowFilter)"
        />

        {/* Outer Cyan Ring */}
        <circle
          cx="100"
          cy="100"
          r="84"
          stroke="url(#cyanTealGrad)"
          strokeWidth="2.5"
          strokeOpacity="0.4"
        />

        {/* Inner Cyan Track Ring */}
        <circle
          cx="100"
          cy="100"
          r="72"
          stroke="#0e314f"
          strokeWidth="1.5"
        />

        {/* 3. Central Barber Pole (Diagonal, clipped to an oval/cylinder in center background) */}
        <g filter="url(#shadowFilter)">
          <mask id="barberMask">
            <rect x="86" y="44" width="28" height="112" rx="14" fill="#ffffff" />
          </mask>
          
          {/* Main Pole Cylindrical Container */}
          <rect
            x="86"
            y="44"
            width="28"
            height="112"
            rx="14"
            fill="#ffffff"
            stroke="url(#cyanTealGrad)"
            strokeWidth="3"
          />
          
          {/* Blue/White Stripes clipped inside the pole */}
          <rect
            x="86"
            y="44"
            width="28"
            height="112"
            rx="14"
            fill="url(#barberStripes)"
            mask="url(#barberMask)"
          />

          {/* Highlights to give 3D cylindrical shine */}
          <rect
            x="88"
            y="46"
            width="6"
            height="108"
            fill="#ffffff"
            fillOpacity="0.4"
            rx="3"
            mask="url(#barberMask)"
          />
          <rect
            x="104"
            y="46"
            width="8"
            height="108"
            fill="#000000"
            fillOpacity="0.15"
            rx="4"
            mask="url(#barberMask)"
          />
        </g>

        {/* 4. Three Glowing Sync Arrows Forming a Circle */}
        <g stroke="url(#cyanTealGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" filter="url(#glowFilter)">
          {/* Arrow 1: Top-Right Arc */}
          <path d="M 125 45 A 68 68 0 0 1 165 110" />
          
          {/* Arrow 2: Bottom Arc */}
          <path d="M 145 135 A 68 68 0 0 1 55 135" />

          {/* Arrow 3: Left Arc */}
          <path d="M 35 110 A 68 68 0 0 1 75 45" />
        </g>

        {/* Arrowheads for the Sync loop */}
        <g fill="url(#cyanTealGrad)" filter="url(#glowFilter)">
          {/* Top Arrowhead (pointing down-right) */}
          <path d="M 120 36 L 138 46 L 123 58 Z" />
          {/* Bottom-Right Arrowhead (pointing left-up) */}
          <path d="M 58 126 L 47 142 L 67 142 Z" />
          {/* Bottom-Left Arrowhead (pointing right-up) */}
          <path d="M 152 114 L 168 126 L 158 140 Z" />
        </g>

        {/* 5. Centerpiece: Crossed Scissors and Straight Razor */}
        <g filter="url(#shadowFilter)">
          {/* Diagonal Scissor Piece (from Left-Down to Right-Up) */}
          <g>
            {/* Scissor Ring (Bottom Left) */}
            <circle cx="56" cy="144" r="14" stroke="url(#glowMetalGrad)" strokeWidth="4.5" fill="none" />
            <circle cx="56" cy="144" r="5" stroke="url(#glowMetalGrad)" strokeWidth="2.5" fill="none" />
            <path d="M 64 134 L 88 106" stroke="url(#glowMetalGrad)" strokeWidth="5.5" strokeLinecap="round" />
            
            {/* Scissor Finger Rest Hook */}
            <path d="M 45 152 C 40 152 38 146 42 142" stroke="url(#glowMetalGrad)" strokeWidth="3" strokeLinecap="round" fill="none" />

            {/* Scissor Blade (Top Right) */}
            <path d="M 98 94 L 154 38 C 158 34 162 36 160 42 L 110 92 Z" fill="url(#glowMetalGrad)" stroke="url(#cyanTealGrad)" strokeWidth="1" />
          </g>

          {/* Diagonal Barber Straight Razor Piece (from Right-Down to Left-Up) */}
          <g>
            {/* Razor Pivot Pin */}
            <circle cx="144" cy="144" r="5" fill="#ffffff" stroke="url(#glowMetalGrad)" strokeWidth="2" />
            
            {/* Razor Scale/Handle (Bottom Right) */}
            <path
              d="M 144 144 C 154 134 175 142 182 118"
              stroke="url(#glowMetalGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            
            {/* Razor Tang & Blade (Left Up) */}
            {/* Shank/Tang */}
            <path d="M 140 140 L 110 106" stroke="url(#glowMetalGrad)" strokeWidth="6" strokeLinecap="round" />
            
            {/* Curved Razor Blade body */}
            <path
              d="M 112 104 L 54 44 C 50 40 44 44 48 50 L 102 110 Z"
              fill="url(#glowMetalGrad)"
              stroke="url(#cyanTealGrad)"
              strokeWidth="1"
            />
            
            {/* Back spine line of razor blade for nice style */}
            <path d="M 54 44 L 102 110" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
          </g>

          {/* Golden Center Pivot Screw */}
          <circle cx="100" cy="100" r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1" />
        </g>
      </svg>

      {/* Text Branding */}
      {(showText || showTagline) && (
        <div className="flex flex-col select-none">
          {showText && (
            <span
              className={`font-sans font-black tracking-tight uppercase leading-none ${textColors[variant]} transition-colors duration-300`}
              style={{ fontSize: size * 0.38 }}
            >
              SYNC<span className="text-cyan-400">BARBER</span>
            </span>
          )}
          {showTagline && (
            <span
              className="text-elegant-gold font-bold tracking-widest uppercase mt-1 leading-none"
              style={{ fontSize: size * 0.15 }}
            >
              Precision & Connection
            </span>
          )}
        </div>
      )}
    </div>
  );
}
