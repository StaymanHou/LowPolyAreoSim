
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import PlayerPlane from './PlayerPlane';
import EndlessTerrain from './EndlessTerrain';
import WeatherSystem from './WeatherSystem';

// Fix: Define intrinsic elements as components to resolve JSX type errors
const Group = 'group' as any;
const Mesh = 'mesh' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const MeshBasicMaterial = 'meshBasicMaterial' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const BoxGeometry = 'boxGeometry' as any;
const TorusGeometry = 'torusGeometry' as any;
const PointLight = 'pointLight' as any;
const SphereGeometry = 'sphereGeometry' as any;
const RingGeometry = 'ringGeometry' as any;

// Noise function (must match EndlessTerrain and PlayerPlane)
function simplexNoise(x: number, z: number) {
  const runwayDist = Math.max(0, Math.abs(x) - 12, Math.abs(z) - 150);
  const flattenFactor = Math.min(1, runwayDist / 30);
  
  const baseNoise = (
    Math.sin(x * 0.02) * Math.cos(z * 0.02) * 15 +
    Math.sin(x * 0.05 + z * 0.05) * 5 +
    Math.sin(x * 0.1) * 2
  );
  
  return baseNoise * flattenFactor;
}

const WIND_PARTICLE_COUNT = 40;

const WindStreaks: React.FC<{ playerPosition: THREE.Vector3 }> = ({ playerPosition }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const particles = useMemo(() => {
    return Array.from({ length: WIND_PARTICLE_COUNT }).map(() => ({
      offset: new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 100
      ),
      speed: Math.random() * 0.5 + 0.5
    }));
  }, []);

  useFrame((state, delta) => {
    if ((window as any).isPaused) return;
    if (!groupRef.current) return;
    
    const stats = (window as any).flightStats;
    const speed = stats ? stats.speed : 0;
    const intensity = Math.max(0, (speed - 150) / 100); 
    
    groupRef.current.visible = intensity > 0;
    if (intensity <= 0) return;

    groupRef.current.children.forEach((child, i) => {
      const p = particles[i];
      p.offset.z -= delta * (speed * 0.5);
      if (p.offset.z < -50) p.offset.z = 50;
      
      child.position.set(
        playerPosition.x + p.offset.x,
        playerPosition.y + p.offset.y,
        playerPosition.z + p.offset.z
      );
      
      child.scale.set(intensity, intensity, 1);
      
      const mesh = child as THREE.Mesh;
      if (mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as THREE.MeshBasicMaterial).opacity = intensity * 0.4;
      }
    });
  });

  return (
    <Group ref={groupRef}>
      {particles.map((_, i) => (
        <Mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <CylinderGeometry args={[0.02, 0.02, 4, 4]} />
          <MeshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </Mesh>
      ))}
    </Group>
  );
};

type TargetType = 'OBELISK' | 'TANK' | 'SHIP' | 'BUILDING' | 'BALLOON';

const Target: React.FC<{ position: THREE.Vector3; type: TargetType; playerPosition: THREE.Vector3 }> = ({ position, type, playerPosition }) => {
  const meshRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if ((window as any).isPaused) return;
    
    const dist = playerPosition.distanceTo(position);
    const proximityIntensity = Math.max(0, 1 - (dist / 400)); // Becomes 1 as we get closer than 400m

    if (meshRef.current) {
      if (type === 'BALLOON') {
        meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.8) * 5;
        meshRef.current.rotation.y += delta * 0.2;
      } else if (type === 'SHIP') {
        meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 0.5) * 0.5;
        meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
      } else {
        meshRef.current.rotation.y += delta * 0.1;
      }
    }

    // Pulse effect
    if (pulseRef.current && ringRef.current) {
      const pulseSpeed = 1 + proximityIntensity * 4;
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.2 * proximityIntensity;
      pulseRef.current.scale.set(pulseScale, pulseScale, pulseScale);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + (proximityIntensity * 0.4);
      
      ringRef.current.rotation.z += delta * (1 + proximityIntensity * 5);
      ringRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1);
    }
  });

  const renderModel = () => {
    switch (type) {
      case 'TANK':
        return (
          <Group position={[0, 2.5, 0]}>
            <Mesh castShadow>
              <BoxGeometry args={[12, 5, 18]} />
              <MeshStandardMaterial color="#3d4e3d" flatShading />
            </Mesh>
            <Mesh position={[0, 4, 0]} castShadow>
              <BoxGeometry args={[8, 4, 8]} />
              <MeshStandardMaterial color="#2d3e2d" flatShading />
            </Mesh>
            <Mesh position={[0, 4.5, 8]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <CylinderGeometry args={[1, 1, 12]} />
              <MeshStandardMaterial color="#1d2e1d" />
            </Mesh>
          </Group>
        );
      case 'SHIP':
        return (
          <Group position={[0, 4, 0]}>
            <Mesh castShadow>
              <BoxGeometry args={[10, 8, 30]} />
              <MeshStandardMaterial color="#2c3e50" flatShading />
            </Mesh>
            <Mesh position={[0, 6, -5]} castShadow>
              <BoxGeometry args={[8, 6, 12]} />
              <MeshStandardMaterial color="#ecf0f1" flatShading />
            </Mesh>
            <Mesh position={[0, 10, -8]} castShadow>
              <CylinderGeometry args={[1.5, 1.5, 5]} />
              <MeshStandardMaterial color="#e74c3c" />
            </Mesh>
          </Group>
        );
      case 'BUILDING':
        return (
          <Group position={[0, 20, 0]}>
            <Mesh castShadow>
              <BoxGeometry args={[15, 40, 15]} />
              <MeshStandardMaterial color="#7f8c8d" flatShading />
            </Mesh>
            <Mesh scale={[1.01, 0.9, 1.01]}>
              <BoxGeometry args={[15, 40, 15]} />
              <MeshStandardMaterial color="#34495e" wireframe />
            </Mesh>
          </Group>
        );
      case 'BALLOON':
        return (
          <Group>
            <Mesh castShadow position={[0, 15, 0]}>
              <SphereGeometry args={[10, 16, 16]} />
              <MeshStandardMaterial color="#e74c3c" flatShading emissive="#220000" />
            </Mesh>
            <Mesh castShadow position={[0, 0, 0]}>
              <BoxGeometry args={[4, 3, 4]} />
              <MeshStandardMaterial color="#795548" flatShading />
            </Mesh>
            {[[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]].map(([x, z], i) => (
               <Mesh key={i} position={[x, 7.5, z]}>
                 <BoxGeometry args={[0.1, 15, 0.1]} />
                 <MeshStandardMaterial color="#ffffff" transparent opacity={0.6} />
               </Mesh>
            ))}
          </Group>
        );
      case 'OBELISK':
      default:
        return (
          <Group position={[0, 20, 0]}>
            <Mesh castShadow>
              <CylinderGeometry args={[0, 8, 40, 4]} />
              <MeshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} emissive="#443300" />
            </Mesh>
            <Mesh rotation={[Math.PI / 2, 0, 0]} ref={ringRef}>
              <TorusGeometry args={[15, 0.5, 8, 32]} />
              <MeshStandardMaterial color="#ffd700" metalness={1} emissive="#664400" />
            </Mesh>
          </Group>
        );
    }
  };

  return (
    <Group ref={meshRef} position={position}>
      {renderModel()}
      {/* Pulsating highlight sphere */}
      <Mesh ref={pulseRef}>
        <SphereGeometry args={[type === 'BALLOON' ? 15 : type === 'OBELISK' ? 25 : 20, 16, 16]} />
        <MeshBasicMaterial color="#ffd700" transparent opacity={0.3} side={THREE.BackSide} />
      </Mesh>
      <PointLight intensity={10} distance={100} color={type === 'OBELISK' ? "#ffd700" : type === 'BALLOON' ? "#ff5555" : "#ffffff"} />
    </Group>
  );
};

/**
 * Audio cue for target proximity
 */
const ProximityAudio: React.FC<{ distance: number }> = ({ distance }) => {
  const audioCtx = useRef<AudioContext | null>(null);
  const nextPingTime = useRef(0);

  const playPing = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioCtx.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Frequency of the beep increases slightly as we get closer
    const freq = 800 + Math.max(0, 1000 - distance) * 0.2;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, [distance]);

  useEffect(() => {
    // Only start pinging within 600m
    if (distance > 600 || (window as any).isPaused || (window as any).isCrashed || (window as any).hasWon) return;

    const interval = Math.max(0.1, (distance / 600) * 1.5); // Ping interval between 0.1s and 1.5s
    
    const tick = () => {
      const now = Date.now();
      if (now >= nextPingTime.current) {
        playPing();
        nextPingTime.current = now + (interval * 1000);
      }
    };

    const timer = setInterval(tick, 50);
    return () => clearInterval(timer);
  }, [distance, playPing]);

  return null;
};

interface GameSceneProps {
  onCrash: () => void;
  onWin: () => void;
  onTargetSet: (name: string) => void;
}

const GameScene: React.FC<GameSceneProps> = ({ onCrash, onWin, onTargetSet }) => {
  const [planePosition, setPlanePosition] = useState(new THREE.Vector3(0, 0, 0));

  const targetData = useMemo(() => {
    const types: TargetType[] = ['OBELISK', 'TANK', 'SHIP', 'BUILDING', 'BALLOON'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    const randomX = (Math.random() - 0.5) * 1200;
    const randomZ = 1500 + Math.random() * 3500;
    let targetY = simplexNoise(randomX, randomZ);

    if (selectedType === 'SHIP') targetY = -2.0; 
    else if (selectedType === 'BALLOON') targetY = 130 + Math.random() * 70;
    else targetY = Math.max(-0.5, targetY);

    const pos = new THREE.Vector3(randomX, targetY, randomZ);
    const names = { 'OBELISK': 'Obelisk', 'TANK': 'Tank', 'SHIP': 'Ship', 'BUILDING': 'Building', 'BALLOON': 'Balloon' };
    const name = names[selectedType];
    (window as any).targetName = name;
    return { type: selectedType, position: pos, name };
  }, []);

  useEffect(() => {
    onTargetSet(targetData.name);
  }, [targetData.name, onTargetSet]);

  const handleUpdate = (pos: THREE.Vector3) => {
    setPlanePosition(pos.clone());
  };

  const distToTarget = useMemo(() => {
    return planePosition.distanceTo(targetData.position);
  }, [planePosition, targetData.position]);

  const isTargetVisible = distToTarget <= 800; // Increased range for visual highlight to be seen

  return (
    <Group>
      <PlayerPlane 
        onUpdate={handleUpdate} 
        onCrash={onCrash} 
        onWin={onWin} 
        targetPos={targetData.position} 
      />
      <EndlessTerrain playerPosition={planePosition} />
      <WindStreaks playerPosition={planePosition} />
      <WeatherSystem playerPosition={planePosition} />
      {isTargetVisible && (
        <Target 
          position={targetData.position} 
          type={targetData.type} 
          playerPosition={planePosition}
        />
      )}
      <ProximityAudio distance={distToTarget} />
    </Group>
  );
};

export default GameScene;
