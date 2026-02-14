
import React, { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars, Environment, PerspectiveCamera } from '@react-three/drei';
import GameScene from './components/GameScene';
import ReplayScene from './components/ReplayScene';
import HUD from './components/HUD';
import LoadingScreen from './components/LoadingScreen';
import StartScreen from './components/StartScreen';
import TutorialOverlay from './components/TutorialOverlay';
import SoundSystem from './components/SoundSystem';

// Fix: Define intrinsic elements as components to resolve JSX type errors
const AmbientLight = 'ambientLight' as any;
const DirectionalLight = 'directionalLight' as any;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'loading' | 'start' | 'playing' | 'crashed' | 'won' | 'replaying'>('loading');
  const [isTutorial, setIsTutorial] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [missionTarget, setMissionTarget] = useState<string>('Target');

  useEffect(() => {
    // Initialize global flags
    (window as any).isPaused = false;
    // Set default volume to 20%
    if ((window as any).masterVolume === undefined) {
      (window as any).masterVolume = 0.2;
    }
    
    // Simulate loading assets
    const timer = setTimeout(() => setGameState('start'), 2000);
    return () => clearTimeout(timer);
  }, []);

  const startGame = () => {
    (window as any).isPaused = false;
    setGameState('playing');
    setIsTutorial(false);
    (window as any).isCrashed = false;
    (window as any).hasWon = false;
  };

  const startTutorial = () => {
    (window as any).isPaused = false;
    setGameState('playing');
    setIsTutorial(true);
    (window as any).isCrashed = false;
    (window as any).hasWon = false;
  };

  const handleCrash = useCallback(() => {
    setGameState('crashed');
  }, []);

  const handleWin = useCallback(() => {
    setGameState('won');
  }, []);

  const handleTargetSet = useCallback((name: string) => {
    setMissionTarget(name);
  }, []);

  const resetGame = () => {
    (window as any).isPaused = false;
    setGameKey(prev => prev + 1);
    setGameState('playing');
    (window as any).isCrashed = false;
    (window as any).hasWon = false;
  };

  const watchReplay = useCallback(() => {
    if ((window as any).lastRecording) {
      setGameState('replaying');
    }
  }, []);

  const quitGame = useCallback(() => {
    (window as any).isPaused = false;
    setGameState('start');
    setGameKey(prev => prev + 1);
    setIsTutorial(false);
    (window as any).isCrashed = false;
    (window as any).hasWon = false;
  }, []);

  // Global escape listener to quit current flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && (gameState === 'playing' || gameState === 'crashed' || gameState === 'won' || gameState === 'replaying')) {
        quitGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, quitGame]);

  const isInAction = gameState === 'playing' || gameState === 'crashed' || gameState === 'won' || gameState === 'replaying';

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-sky-400">
      <SoundSystem />
      
      {gameState === 'loading' && <LoadingScreen />}
      
      {gameState === 'start' && <StartScreen onStart={startGame} onTutorial={startTutorial} />}

      {isInAction && (
        <>
          <Canvas shadows key={gameKey}>
            <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={75} />
            <Sky distance={450000} sunPosition={[0, 1, 0]} inclination={0} azimuth={0.25} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <AmbientLight intensity={0.5} />
            <DirectionalLight
              position={[10, 20, 10]}
              intensity={1.5}
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
            />
            {gameState === 'replaying' ? (
                <ReplayScene 
                    recording={(window as any).lastRecording} 
                    onFinish={() => setGameState('start')} 
                />
            ) : (
                <GameScene onCrash={handleCrash} onWin={handleWin} onTargetSet={handleTargetSet} />
            )}
            <Environment preset="city" />
          </Canvas>
          <HUD onReset={resetGame} onWatchReplay={watchReplay} status={gameState} />
          {isTutorial && gameState === 'playing' && (
            <TutorialOverlay onDismiss={() => {
              setIsTutorial(false);
              (window as any).isPaused = false;
            }} />
          )}
        </>
      )}

      {/* Instructions Overlay */}
      <div className="absolute bottom-4 left-4 p-4 bg-black/30 backdrop-blur-md rounded-xl text-white text-xs pointer-events-none border border-white/10">
        <p className="font-bold mb-1 uppercase tracking-tighter opacity-50 text-[10px]">Controls</p>
        <p>S / W — Pitch Up / Down</p>
        <p>A / D — Roll Left / Right</p>
        <p>Shift / Space — Throttle</p>
        <p>Q / E — Yaw</p>
        <p>V — Switch View</p>
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-sky-300 font-bold uppercase tracking-tight">Objective:</p>
          <p className="text-amber-400 font-bold">Find and impact the target ({missionTarget.toLowerCase()})</p>
          <p className="mt-1 opacity-60">ESC — Quit to Menu</p>
        </div>
      </div>
    </div>
  );
};

export default App;
