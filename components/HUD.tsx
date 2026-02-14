
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

interface HUDProps {
  onReset: () => void;
  onWatchReplay: () => void;
  status: 'playing' | 'crashed' | 'won' | 'replaying';
}

const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

const HUD: React.FC<HUDProps> = ({ onReset, onWatchReplay, status }) => {
  const [stats, setStats] = useState({ 
    speed: 0, 
    altitude: 0, 
    terrainAlt: 0,
    throttle: 0, 
    heading: 0, 
    distToTarget: 0, 
    pitch: 0, 
    roll: 0,
    hull: 100,
    isScraping: false,
    isStalling: false,
    isReplaying: false,
    replayMode: 'CHASE',
    progress: 0
  });
  const [radioMessage, setRadioMessage] = useState<string>("GFC: AeroSim-1, you are cleared for departure. Contact Departure on 124.8.");
  const [isReceiving, setIsReceiving] = useState(false);
  const [lastGenTime, setLastGenTime] = useState(0);
  const [volume, setVolume] = useState((window as any).masterVolume ?? 0.2);

  const isCrashed = status === 'crashed';
  const hasWon = status === 'won';
  const isReplaying = status === 'replaying';
  const targetName = (window as any).targetName || "The Objective";
  const weather = (window as any).currentWeather || 'CLEAR';

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).flightStats) {
        setStats((window as any).flightStats);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (window as any).masterVolume = volume;
  }, [volume]);

  // GPWS Logic
  const isPullUp = useMemo(() => {
    if (isReplaying) return false;
    const heightAboveGround = stats.altitude - stats.terrainAlt;
    return heightAboveGround > 2 && heightAboveGround < 20 && stats.speed > 50 && !stats.isScraping && !stats.isStalling;
  }, [stats.altitude, stats.terrainAlt, stats.speed, stats.isScraping, stats.isStalling, isReplaying]);

  useEffect(() => {
    if (isReplaying) {
        setRadioMessage(`REPLAY ACTIVE | CAMERA: ${stats.replayMode} | [1-4] TO CHANGE`);
        return;
    }
    if (isCrashed) {
      setRadioMessage("GFC: MAYDAY! MAYDAY! AeroSim-1, we've lost your transponder. Search and rescue initiated.");
      return;
    }
    if (hasWon) {
      setRadioMessage(`GFC: Objective confirmed neutralized. Outstanding work, Pilot. RTB for debrief.`);
      return;
    }
    if (stats.isStalling) {
      setRadioMessage("GFC: STALL! STALL! AeroSim-1, nose down and increase power immediately!");
      return;
    }
    if (stats.isScraping) {
      setRadioMessage("GFC: AeroSim-1, you're scraping terrain! Pull up immediately!");
      return;
    }

    const generateChatter = async () => {
      const now = Date.now();
      if (now - lastGenTime < 25000 || (window as any).isPaused || isReplaying) return;
      
      setIsReceiving(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `AeroSim-1 status report: Alt ${stats.altitude}m, Hull ${stats.hull}%, Speed ${stats.speed}kph, Weather: ${weather}, Stalling: ${stats.isStalling}.`,
          config: { 
            systemInstruction: "You are the Gemini Flight Center dispatcher. Speak in professional aviation terminology. Mention altitude, speed, or hull status if low. Use 'Roger', 'Maintain', 'Caution'. Max 12 words.",
            temperature: 0.9 
          }
        });
        
        if (response.text) {
          setRadioMessage(`GFC: ${response.text.trim()}`);
          setLastGenTime(now);
        }
      } catch (e) {
        console.error("Gemini failed to chatter", e);
      } finally {
        setIsReceiving(false);
      }
    };

    const chatterInterval = setInterval(generateChatter, 5000);
    return () => clearInterval(chatterInterval);
  }, [stats, lastGenTime, isCrashed, hasWon, weather, isReplaying]);

  const weatherLabel = useMemo(() => {
    switch (weather) {
      case 'RAIN': return { text: 'STORM WARNING', color: 'text-blue-400', icon: '⚡' };
      case 'SNOW': return { text: 'ICING CONDITIONS', color: 'text-indigo-200', icon: '❄️' };
      case 'FOG': return { text: 'LOW VISIBILITY', color: 'text-gray-400', icon: '🌫️' };
      default: return { text: 'CLEAR SKIES', color: 'text-emerald-400', icon: '☀️' };
    }
  }, [weather]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 overflow-hidden font-mono">
      {/* Heading Tape */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="w-64 h-8 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden relative shadow-2xl">
          <div 
            className="flex gap-0 h-full transition-transform duration-100 ease-out"
            style={{ transform: `translateX(${-stats.heading * 2 + 64}px)` }}
          >
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = (i * 10) % 360;
              let label = angle.toString();
              if (angle === 0) label = "N";
              if (angle === 90) label = "E";
              if (angle === 180) label = "S";
              if (angle === 270) label = "W";
              return (
                <div key={i} className="min-w-[20px] h-full flex flex-col items-center justify-end pb-1">
                  <span className={`text-[8px] font-black ${['N','E','S','W'].includes(label) ? 'text-sky-400' : 'text-white/40'}`}>{label}</span>
                  <div className={`w-[1px] ${angle % 30 === 0 ? 'h-3 bg-white/40' : 'h-1.5 bg-white/10'}`} />
                </div>
              );
            })}
          </div>
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-red-500 shadow-[0_0_8px_#ef4444]" />
        </div>
        <div className="mt-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
          <span className="text-[10px] font-black text-sky-400">{stats.heading}°</span>
        </div>
      </div>

      <div className="flex justify-between items-start z-10">
        <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-5 border border-white/10 text-white min-w-[240px] shadow-2xl">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
             <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isReplaying ? 'bg-red-500 animate-pulse' : 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]'}`} />
               <h1 className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                   {isReplaying ? 'Replay System' : 'Flight Computer'}
               </h1>
             </div>
             <span className={`text-[9px] font-black tracking-tighter flex items-center gap-1 ${weatherLabel.color}`}>
               {weatherLabel.icon} {weatherLabel.text}
             </span>
          </div>
          <div className="space-y-3">
            {!isReplaying && (
                <div className="flex justify-between items-end">
                <span className="text-[10px] text-white/40 font-bold uppercase">Hull Integrity</span>
                <div className="flex flex-col items-end">
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                    <div className={`h-full transition-all duration-300 ${stats.hull > 50 ? 'bg-emerald-500' : stats.hull > 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${stats.hull}%` }} />
                    </div>
                    <span className={`text-[10px] font-black ${stats.hull < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{stats.hull}%</span>
                </div>
                </div>
            )}
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-white/40 font-bold uppercase">Altitude</span>
              <span className="text-xl font-black leading-none">{stats.altitude}<span className="text-[10px] ml-1 text-white/40">M</span></span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-white/40 font-bold uppercase">Airspeed</span>
              <span className="text-xl font-black leading-none text-sky-300">{stats.speed}<span className="text-[10px] ml-1 text-sky-300/40">KMH</span></span>
            </div>
            {!isReplaying ? (
                <div className="flex justify-between items-end pt-1">
                <span className="text-[10px] text-white/40 font-bold uppercase">Target Range</span>
                <span className={`text-xl font-black leading-none ${stats.distToTarget < 500 ? 'text-amber-400' : 'text-white'}`}>
                    {stats.distToTarget}
                    <span className={`text-[10px] ml-1 ${stats.distToTarget < 500 ? 'text-amber-400/60' : 'text-white/40'}`}>M</span>
                </span>
                </div>
            ) : (
                <div className="flex flex-col pt-1 gap-1">
                    <span className="text-[10px] text-white/40 font-bold uppercase">Replay Progress</span>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${stats.progress}%` }} />
                    </div>
                </div>
            )}
          </div>
        </div>

        {/* Radio & Volume Console */}
        <div className="flex flex-col gap-4">
          <div className={`bg-black/60 backdrop-blur-xl rounded-2xl p-5 border border-white/10 text-white w-96 transition-all duration-500 shadow-2xl ${isCrashed ? 'border-red-500/50' : hasWon ? 'border-amber-500/50' : ''}`}>
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">Frequency</span>
                  <span className="text-xs font-black text-sky-400">124.80 MHz</span>
                </div>
              </div>
              {isReceiving && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">REC</span>
                </div>
              )}
            </div>
            <div className="min-h-[40px] bg-white/5 rounded-lg p-3 border border-white/5">
              <p className="text-sm leading-relaxed text-sky-100/90 italic font-medium">
                <TypewriterText text={radioMessage} />
              </p>
            </div>
          </div>

          <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-white w-48 self-end pointer-events-auto flex items-center justify-between shadow-2xl">
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Audio Out</span>
              <span className="text-[10px] font-bold text-sky-400">Master Vol</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 group">
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="w-full h-full rounded-full border-2 border-white/10 flex items-center justify-center bg-black/40 overflow-hidden relative">
                   {/* Visual "Dial" representation */}
                   <div 
                    className="w-[2px] h-[10px] bg-sky-400 absolute top-1 rounded-full origin-bottom"
                    style={{ 
                      transformOrigin: '50% 100%',
                      transform: `rotate(${(volume * 270) - 135}deg) translateY(-8px)` 
                    }}
                   />
                   <div className="w-1.5 h-1.5 bg-sky-400 rounded-full shadow-[0_0_10px_#38bdf8]" />
                </div>
              </div>
              <span className="text-[10px] font-black text-sky-300/80 w-8">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* GPWS and Stall Warning */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
        {stats.isStalling && !isReplaying && (
          <div className="bg-red-700/95 text-white px-10 py-4 rounded-lg border-4 border-white/30 animate-pulse shadow-[0_0_60px_rgba(185,28,28,0.7)] flex flex-col items-center">
            <span className="text-4xl font-black tracking-[0.2em]">STALL</span>
            <span className="text-xs font-bold mt-1 opacity-80 uppercase">Lower Nose / Max Power</span>
          </div>
        )}
        {isPullUp && !stats.isStalling && (
          <div className="bg-red-600/90 text-white px-8 py-3 rounded-lg border-4 border-white/20 animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.5)]">
            <span className="text-3xl font-black tracking-widest">PULL UP!</span>
          </div>
        )}
        {stats.isScraping && !isReplaying && (
          <div className="bg-amber-600/90 text-white px-8 py-3 rounded-lg border-4 border-white/20 animate-bounce shadow-[0_0_40px_rgba(217,119,6,0.5)]">
            <span className="text-3xl font-black tracking-widest italic">HULL SCRAPE</span>
          </div>
        )}
      </div>

      {(isCrashed || hasWon) && (
        <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-sm pointer-events-auto z-20 ${isCrashed ? 'bg-red-900/20' : 'bg-amber-900/20'}`}>
          <div className={`bg-black/90 p-12 rounded-[40px] border shadow-[0_0_100px_rgba(0,0,0,0.5)] text-center animate-in fade-in zoom-in duration-300 ${isCrashed ? 'border-red-500 shadow-red-500/20' : 'border-amber-500 shadow-amber-500/20'}`}>
            <h2 className={`text-6xl font-black italic mb-4 tracking-tighter ${isCrashed ? 'text-red-500' : 'text-amber-500'}`}>
              {isCrashed ? 'HULL BREACH' : 'STRIKE CONFIRMED'}
            </h2>
            <p className="text-white/40 mb-10 uppercase tracking-[0.3em] text-[10px] font-bold">
              {isCrashed ? 'Impact velocity exceeded airframe limits' : `${targetName} tactical data recorded`}
            </p>
            <div className="flex flex-col gap-4">
                <button 
                onClick={onReset}
                className={`px-12 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 transition-all transform active:scale-95 shadow-2xl tracking-widest text-xs uppercase ${isCrashed ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-amber-500 hover:text-white'}`}
                >
                {isCrashed ? 'DEPLOY REPLACEMENT CRAFT' : 'COMMENCE NEXT SORTIE'}
                </button>
                <button 
                onClick={onWatchReplay}
                className={`px-12 py-4 bg-white/10 text-white border border-white/20 font-black rounded-2xl hover:scale-105 transition-all transform active:scale-95 shadow-2xl tracking-widest text-xs uppercase hover:bg-white hover:text-black`}
                >
                Watch Mission Replay
                </button>
            </div>
          </div>
        </div>
      )}

      {isReplaying && (
          <div className="absolute top-1/2 right-12 -translate-y-1/2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 pointer-events-auto text-white shadow-2xl w-48">
              <h4 className="text-[10px] font-black uppercase text-sky-400 mb-4 tracking-widest">Camera Angles</h4>
              <div className="flex flex-col gap-2">
                  {[
                      { id: 'CHASE', key: '1' },
                      { id: 'COCKPIT', key: '2' },
                      { id: 'FLYBY', key: '3' },
                      { id: 'STATIC', key: '4' }
                  ].map(mode => (
                      <div key={mode.id} className={`flex justify-between items-center p-2 rounded-lg border ${stats.replayMode === mode.id ? 'bg-sky-500/20 border-sky-500' : 'bg-white/5 border-transparent'}`}>
                          <span className="text-[10px] font-bold">{mode.id}</span>
                          <span className="text-[10px] font-black text-white/30">[{mode.key}]</span>
                      </div>
                  ))}
              </div>
              <button 
                onClick={onReset}
                className="mt-6 w-full py-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white font-black rounded-xl transition-all text-[10px] uppercase tracking-widest border border-red-500/30"
              >
                Exit Replay
              </button>
          </div>
      )}

      <div className={`flex justify-center items-end transition-all duration-700 z-10 ${isCrashed || hasWon ? 'opacity-0 translate-y-32' : 'opacity-100 translate-y-0'}`}>
        <div className="bg-black/60 backdrop-blur-2xl rounded-t-[40px] px-16 py-8 flex gap-20 border-t border-x border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-white/30 font-black mb-4 tracking-widest uppercase">Engine Thrust</span>
            <div className="w-4 h-32 bg-white/5 rounded-full relative overflow-hidden border border-white/5">
              <div 
                className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600 to-sky-300 transition-all duration-300 shadow-[0_0_20px_rgba(56,189,248,0.4)]" 
                style={{ height: `${stats.throttle}%` }}
              />
            </div>
            <span className="mt-3 text-white font-black text-sm">{stats.throttle}%</span>
          </div>

          <div className="flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-full border-4 border-white/10 relative flex items-center justify-center bg-black/40 overflow-hidden shadow-inner">
                <div 
                  className="absolute inset-0 transition-all duration-100 flex flex-col"
                  style={{ transform: `rotate(${-stats.roll}deg) translateY(${stats.pitch * 0.5}px)` }}
                >
                  <div className={`h-1/2 w-full transition-colors duration-500 ${stats.isStalling ? 'bg-red-500/40' : 'bg-sky-500/20'}`} />
                  <div className="h-1 w-full bg-white/40" />
                  <div className="h-1/2 w-full bg-orange-900/20" />
                </div>
                <div className="w-20 h-[2px] bg-sky-400 absolute shadow-[0_0_15px_#38bdf8] z-10" />
                <div className="w-1 h-1 bg-sky-400 rounded-full absolute z-10 shadow-[0_0_100px_#38bdf8]" />
             </div>
          </div>

          <div className="flex flex-col items-center justify-center">
             <span className="text-[9px] text-white/30 font-black mb-4 tracking-widest uppercase">Landing Gear</span>
             <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors ${(stats.altitude - stats.terrainAlt) < 5 ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 opacity-30'}`}>
                <span className={`text-[10px] font-black ${(stats.altitude - stats.terrainAlt) < 5 ? 'text-emerald-500' : 'text-white/40'}`}>DOWN</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
