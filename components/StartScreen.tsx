
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  onTutorial: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onTutorial }) => (
  <div className="absolute inset-0 z-40 bg-gradient-to-br from-sky-400 to-blue-600 flex flex-col items-center justify-center text-white p-6">
    <div className="max-w-md text-center">
      <div className="mb-6 inline-block p-3 bg-white/10 rounded-full backdrop-blur-xl">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </div>
      <h1 className="text-6xl font-black italic tracking-tighter mb-2">AEROSIM</h1>
      <p className="text-sky-100 mb-8 text-lg font-light leading-relaxed">
        A serene low-poly flight experience. Pilot your craft through endless vistas, guided by atmospheric AI radio chatter.
      </p>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={onStart}
          className="group relative px-8 py-4 bg-white text-sky-600 font-bold rounded-full overflow-hidden hover:scale-105 transition-all shadow-2xl active:scale-95"
        >
          <span className="relative z-10">COMMENCE FLIGHT</span>
          <div className="absolute inset-0 bg-sky-100 transform translate-y-full group-hover:translate-y-0 transition-transform" />
        </button>

        <button 
          onClick={onTutorial}
          className="px-8 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-full hover:bg-white/20 transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-widest"
        >
          Flight School (Tutorial)
        </button>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4 text-xs text-sky-200 opacity-70">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span>Procedural Landscapes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span>Smooth Flight Physics</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span>Dynamic AI Chatter</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
          <span>Zero Combat Zen Mode</span>
        </div>
      </div>
    </div>
  </div>
);

export default StartScreen;
