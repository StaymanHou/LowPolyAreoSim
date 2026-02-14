
import React from 'react';

const LoadingScreen: React.FC = () => (
  <div className="absolute inset-0 z-50 bg-sky-600 flex flex-col items-center justify-center text-white">
    <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
    <h2 className="text-2xl font-bold tracking-tighter italic">AEROSIM</h2>
    <p className="text-sky-200 text-sm animate-pulse">Initializing Flight Systems...</p>
  </div>
);

export default LoadingScreen;
