import React from 'react';

interface AnimatedSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Glow colors are mapped to the project palette:
//   primary  → blue-600  #2563eb  /  indigo-800 #1e40af
//   accent   → gold      #D4983A  /  gold-dark  #92400e
//   navy bg  → #0a0f1e  /  #111827  /  #0a2040

export default function AnimatedSearchBar({ value, onChange, placeholder = 'Поиск…' }: AnimatedSearchBarProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div id="poda" className="relative flex items-center justify-center group">



        {/* Input */}
        <div className="relative group">
          <input
            placeholder={placeholder}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-white dark:bg-zinc-800 border-none w-[301px] h-[56px] rounded-lg text-zinc-800 dark:text-zinc-100 px-[59px] text-sm focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
          />




          {/* Search icon */}
          <div className="absolute left-5 top-[15px] pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none">
              <circle stroke="url(#srch-grad)" r="8" cy="11" cx="11" />
              <line stroke="url(#srch-line)" y2="16.65" y1="22" x2="16.65" x1="22" />
              <defs>
                <linearGradient gradientTransform="rotate(50)" id="srch-grad">
                  <stop stopColor="#93c5fd" offset="0%" />
                  <stop stopColor="#60a5fa" offset="50%" />
                </linearGradient>
                <linearGradient id="srch-line">
                  <stop stopColor="#60a5fa" offset="0%" />
                  <stop stopColor="#3b82f6" offset="50%" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
