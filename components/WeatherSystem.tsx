
import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export type WeatherType = 'CLEAR' | 'RAIN' | 'SNOW' | 'FOG';

const PARTICLE_COUNT = 800;

const WeatherSystem: React.FC<{ playerPosition: THREE.Vector3 }> = ({ playerPosition }) => {
  const { scene } = useThree();
  const [weather, setWeather] = useState<WeatherType>('CLEAR');
  const particlesRef = useRef<THREE.Group>(null);
  
  // Transition logic
  useEffect(() => {
    const cycle = () => {
      // Weighted weather selection: 70% CLEAR, 10% RAIN, 10% SNOW, 10% FOG
      const weathers: WeatherType[] = [
        'CLEAR', 'CLEAR', 'CLEAR', 'CLEAR', 'CLEAR', 'CLEAR', 'CLEAR', 
        'RAIN', 
        'SNOW', 
        'FOG'
      ];
      const next = weathers[Math.floor(Math.random() * weathers.length)];
      setWeather(next);
      (window as any).currentWeather = next;
    };
    const timer = setInterval(cycle, 45000); // Cycle every 45s
    cycle();
    return () => clearInterval(timer);
  }, []);

  // Fog and Background updates
  useEffect(() => {
    let color = new THREE.Color('#87CEEB');
    let density = 0.0005;

    switch (weather) {
      case 'RAIN':
        color = new THREE.Color('#4a5568');
        density = 0.012;
        break;
      case 'SNOW':
        color = new THREE.Color('#cbd5e0');
        density = 0.015;
        break;
      case 'FOG':
        color = new THREE.Color('#a0aec0');
        density = 0.035;
        break;
      case 'CLEAR':
      default:
        color = new THREE.Color('#87CEEB');
        density = 0.0005;
        break;
    }

    scene.background = color;
    scene.fog = new THREE.FogExp2(color, density);
  }, [weather, scene]);

  const particleData = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 150,
        Math.random() * 80,
        (Math.random() - 0.5) * 150
      ),
      speed: Math.random() * 0.5 + 0.5
    }));
  }, []);

  useFrame((state, delta) => {
    if ((window as any).isPaused) return;
    if (!particlesRef.current || weather === 'CLEAR' || weather === 'FOG') return;

    particlesRef.current.children.forEach((child, i) => {
      const p = particleData[i];
      
      if (weather === 'RAIN') {
        p.pos.y -= delta * 150 * p.speed;
        if (p.pos.y < -10) p.pos.y = 80;
      } else if (weather === 'SNOW') {
        p.pos.y -= delta * 20 * p.speed;
        p.pos.x += Math.sin(state.clock.elapsedTime + i) * 0.1;
        if (p.pos.y < -10) p.pos.y = 80;
      }

      child.position.set(
        playerPosition.x + p.pos.x,
        playerPosition.y + p.pos.y,
        playerPosition.z + p.pos.z
      );
    });
  });

  return (
    <group ref={particlesRef}>
      {weather !== 'CLEAR' && weather !== 'FOG' && particleData.map((_, i) => (
        <mesh key={i}>
          {weather === 'RAIN' ? (
            <boxGeometry args={[0.05, 1.5, 0.05]} />
          ) : (
            <boxGeometry args={[0.2, 0.2, 0.2]} />
          )}
          <meshBasicMaterial 
            color={weather === 'RAIN' ? "#88ccff" : "#ffffff"} 
            transparent 
            opacity={0.6} 
          />
        </mesh>
      ))}
    </group>
  );
};

export default WeatherSystem;
