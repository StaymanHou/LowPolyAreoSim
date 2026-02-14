
import React, { useEffect, useRef } from 'react';

/**
 * Procedural Sound System for AeroSim
 * Generates engine, wind, and impact sounds using Web Audio API
 */
const SoundSystem: React.FC = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  
  // Audio Nodes
  const masterGain = useRef<GainNode | null>(null);
  const engineOsc = useRef<OscillatorNode | null>(null);
  const engineGain = useRef<GainNode | null>(null);
  const engineMod = useRef<OscillatorNode | null>(null);
  const engineModGain = useRef<GainNode | null>(null);
  
  const windFilter = useRef<BiquadFilterNode | null>(null);
  const windGain = useRef<GainNode | null>(null);
  
  const scrapeGain = useRef<GainNode | null>(null);
  
  const initialized = useRef(false);

  useEffect(() => {
    const initAudio = () => {
      if (initialized.current) return;
      
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtx.current;

      // Master Output
      masterGain.current = ctx.createGain();
      // Use 0.2 as fallback for master volume
      masterGain.current.gain.setValueAtTime((window as any).masterVolume ?? 0.2, ctx.currentTime);
      masterGain.current.connect(ctx.destination);

      // --- Engine Sound ---
      engineOsc.current = ctx.createOscillator();
      engineOsc.current.type = 'sawtooth';
      engineOsc.current.frequency.setValueAtTime(40, ctx.currentTime);
      
      engineGain.current = ctx.createGain();
      engineGain.current.gain.setValueAtTime(0, ctx.currentTime);

      engineMod.current = ctx.createOscillator();
      engineMod.current.type = 'square';
      engineMod.current.frequency.setValueAtTime(8, ctx.currentTime);
      
      engineModGain.current = ctx.createGain();
      engineModGain.current.gain.setValueAtTime(0.3, ctx.currentTime);
      
      engineMod.current.connect(engineModGain.current);
      engineModGain.current.connect(engineGain.current.gain); 
      
      engineOsc.current.connect(engineGain.current);
      engineGain.current.connect(masterGain.current); // Route through master
      
      engineOsc.current.start();
      engineMod.current.start();

      // --- Wind Sound ---
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      
      windFilter.current = ctx.createBiquadFilter();
      windFilter.current.type = 'bandpass';
      windFilter.current.frequency.setValueAtTime(500, ctx.currentTime);
      windFilter.current.Q.setValueAtTime(0.5, ctx.currentTime);
      
      windGain.current = ctx.createGain();
      windGain.current.gain.setValueAtTime(0, ctx.currentTime);
      
      whiteNoise.connect(windFilter.current);
      windFilter.current.connect(windGain.current);
      windGain.current.connect(masterGain.current); // Route through master
      whiteNoise.start();

      // --- Scrape Sound ---
      const scrapeNoise = ctx.createBufferSource();
      scrapeNoise.buffer = noiseBuffer;
      scrapeNoise.loop = true;
      
      const scrapeFilter = ctx.createBiquadFilter();
      scrapeFilter.type = 'highpass';
      scrapeFilter.frequency.setValueAtTime(2000, ctx.currentTime);
      
      scrapeGain.current = ctx.createGain();
      scrapeGain.current.gain.setValueAtTime(0, ctx.currentTime);
      
      scrapeNoise.connect(scrapeFilter);
      scrapeFilter.connect(scrapeGain.current);
      scrapeGain.current.connect(masterGain.current); // Route through master
      scrapeNoise.start();

      initialized.current = true;
    };

    window.addEventListener('mousedown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    const triggerImpact = (type: 'crash' | 'win') => {
      if (!audioCtx.current || !masterGain.current) return;
      const ctx = audioCtx.current;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      if (type === 'crash') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
      }
      
      osc.connect(gain);
      gain.connect(masterGain.current); // Impact sounds through master gain
      osc.start();
      osc.stop(ctx.currentTime + (type === 'crash' ? 0.5 : 1.0));
    };

    let lastCrashed = false;
    let lastWon = false;

    const tick = () => {
      if (!audioCtx.current || !initialized.current) return;
      const ctx = audioCtx.current;
      const stats = (window as any).flightStats;
      const isPaused = (window as any).isPaused;
      const isCrashed = (window as any).isCrashed;
      const hasWon = (window as any).hasWon;

      // Update Master Volume
      if (masterGain.current) {
        masterGain.current.gain.setTargetAtTime((window as any).masterVolume ?? 0.2, ctx.currentTime, 0.05);
      }

      if (isCrashed && !lastCrashed) {
        triggerImpact('crash');
        lastCrashed = true;
      }
      if (!isCrashed) lastCrashed = false;

      if (hasWon && !lastWon) {
        triggerImpact('win');
        lastWon = true;
      }
      if (!hasWon) lastWon = false;

      // Stop engine/wind/scrape loops if the game is paused, crashed, or won
      if (isPaused || isCrashed || hasWon) {
        engineGain.current?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        windGain.current?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        scrapeGain.current?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        return;
      }

      if (stats) {
        const t = stats.throttle / 100;
        engineOsc.current?.frequency.setTargetAtTime(30 + (t * 100), ctx.currentTime, 0.1);
        engineMod.current?.frequency.setTargetAtTime(5 + (t * 15), ctx.currentTime, 0.1);
        engineGain.current?.gain.setTargetAtTime(0.1 + (t * 0.25), ctx.currentTime, 0.1);

        const s = stats.speed / 300; 
        windFilter.current?.frequency.setTargetAtTime(200 + (s * 4000), ctx.currentTime, 0.1);
        windGain.current?.gain.setTargetAtTime(s * 0.15, ctx.currentTime, 0.1);

        if (stats.isScraping) {
          scrapeGain.current?.gain.setTargetAtTime(0.1, ctx.currentTime, 0.05);
        } else {
          scrapeGain.current?.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        }
      }
    };

    const interval = setInterval(tick, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener('mousedown', initAudio);
      window.removeEventListener('keydown', initAudio);
      if (audioCtx.current) {
        audioCtx.current.close();
      }
    };
  }, []);

  return null;
};

export default SoundSystem;
