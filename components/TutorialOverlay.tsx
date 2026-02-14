
import React, { useState, useEffect, useRef } from 'react';

interface TutorialOverlayProps {
  onDismiss: () => void;
}

interface TutorialStep {
  title: string;
  instruction: string;
  condition: ((stats: any) => boolean) | null;
  resumeKeys?: string[];
  pauseOnStart: boolean;
}

const STEPS: TutorialStep[] = [
  {
    title: "Step 1: Throttle Up",
    instruction: "The game is paused. Press and hold [SHIFT] to resume and increase throttle to 100%.",
    condition: (stats: any) => stats.throttle >= 95,
    resumeKeys: ['ShiftLeft'],
    pauseOnStart: true
  },
  {
    title: "Step 2: Takeoff Speed",
    instruction: "The engines are roaring. Keep it straight and wait for 145 km/h. Don't touch the stick yet.",
    condition: (stats: any) => stats.speed >= 145,
    pauseOnStart: false
  },
  {
    title: "Step 3: Rotate",
    instruction: "Speed reached! The game is paused. Pull back by pressing [S] to resume and take flight.",
    condition: (stats: any) => stats.altitude >= 15,
    resumeKeys: ['KeyS'],
    pauseOnStart: true
  },
  {
    title: "Step 4: Maneuvering",
    instruction: "You are airborne. Use [A] and [D] to roll, and [W] to pitch down. Track your target on the horizon.",
    condition: (stats: any) => true,
    resumeKeys: ['KeyA', 'KeyD', 'KeyW', 'KeyS'],
    pauseOnStart: false
  },
  {
    title: "Final Mission",
    instruction: "Track the yellow distance marker in your HUD. Impact the target to complete the mission. Good luck, Pilot.",
    condition: null,
    pauseOnStart: false
  }
];

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onDismiss }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [flash, setFlash] = useState(false);
  const lastStepRef = useRef(-1);

  // Sync window pause state and step transitions
  useEffect(() => {
    const step = STEPS[currentStep];
    
    // If we just entered a new step that requires pausing
    if (lastStepRef.current !== currentStep) {
      if (step.pauseOnStart) {
        (window as any).isPaused = true;
      }
      lastStepRef.current = currentStep;
    }

    const interval = setInterval(() => {
      // Only check conditions if NOT paused
      if ((window as any).isPaused) return;

      const stats = (window as any).flightStats;
      if (!stats) return;

      const currentStepObj = STEPS[currentStep];
      if (currentStepObj.condition && currentStepObj.condition(stats)) {
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
          setFlash(true);
          setTimeout(() => setFlash(false), 500);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentStep]);

  // Key listener for resuming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = STEPS[currentStep];
      if ((window as any).isPaused && step.resumeKeys?.includes(e.code)) {
        (window as any).isPaused = false;
        // If it's a "Maneuvering" type step that finishes immediately on key press
        if (step.title === "Step 4: Maneuvering") {
          setTimeout(() => {
            setCurrentStep(prev => prev + 1);
            setFlash(true);
            setTimeout(() => setFlash(false), 500);
          }, 2000); // Give them 2 seconds of unpaused flight before final message
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep]);

  const step = STEPS[currentStep];

  return (
    <div className="absolute inset-x-0 top-1/4 flex justify-center pointer-events-none z-30">
      <div className={`
        max-w-sm bg-black/60 backdrop-blur-xl border-2 p-6 rounded-3xl text-white shadow-2xl transition-all duration-500 transform
        ${flash ? 'border-sky-400 scale-105' : 'border-white/10 scale-100'}
        pointer-events-auto
      `}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-400 tracking-[0.2em] uppercase">Flight Training</span>
            {(window as any).isPaused && (
              <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">Paused</span>
            )}
          </div>
          <button 
            onClick={onDismiss}
            className="text-white/40 hover:text-white transition-colors text-xs uppercase font-bold"
          >
            Skip
          </button>
        </div>
        
        <h3 className="text-xl font-black italic mb-2 tracking-tighter text-white">
          {step.title}
        </h3>
        
        <p className="text-sky-100/80 text-sm leading-relaxed mb-6">
          {step.instruction}
        </p>

        {currentStep === STEPS.length - 1 ? (
          <button 
            onClick={onDismiss}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl transition-colors text-sm uppercase tracking-widest"
          >
            I'm Ready
          </button>
        ) : (
          <div className="flex gap-1 h-1">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-sky-400' : 'bg-white/10'}`} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TutorialOverlay;
