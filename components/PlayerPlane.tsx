
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useKeyboard } from '../hooks/useKeyboard';

const Group = 'group' as any;
const Mesh = 'mesh' as any;
const BoxGeometry = 'boxGeometry' as any;
const CylinderGeometry = 'cylinderGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const Primitive = 'primitive' as any;

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

export interface ReplayFrame {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  throttle: number;
  isStalling: boolean;
  isScraping: boolean;
  speed: number;
  altitude: number;
}

interface PlayerPlaneProps {
  onUpdate: (pos: THREE.Vector3) => void;
  onCrash: () => void;
  onWin: () => void;
  targetPos: THREE.Vector3;
}

const ScrapeParticles: React.FC<{ active: boolean; position: any }> = ({ active, position }) => {
  const group = useRef<THREE.Group>(null);
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map(() => ({
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5),
      life: 0
    }));
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.visible = active;
    if (!active) return;

    group.current.children.forEach((child, i) => {
      const p = particles[i];
      p.life += delta;
      child.position.add(p.vel.clone().multiplyScalar(delta));
      p.vel.y -= 9.8 * delta;
      
      if (p.life > 0.5) {
        child.position.set(0, 0, 0);
        p.life = 0;
        p.vel.set((Math.random() - 0.5) * 10, Math.random() * 5, (Math.random() - 1.0) * 15);
      }
    });
  });

  return (
    <Group ref={group} position={position}>
      {particles.map((_, i) => (
        <Mesh key={i}>
          <BoxGeometry args={[0.2, 0.2, 0.2]} />
          <MeshStandardMaterial color="#e67e22" emissive="#d35400" />
        </Mesh>
      ))}
    </Group>
  );
};

const Explosion: React.FC<{ position: any; color?: string; intensity?: number }> = ({ position, color, intensity = 1 }) => {
  const group = useRef<THREE.Group>(null);
  const count = Math.floor(35 * intensity);
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      speed: (Math.random() * 10 + 5) * intensity,
      scale: (Math.random() * 2.5 + 0.5) * intensity
    }));
  }, [count, intensity]);

  useFrame((state, delta) => {
    if ((window as any).isPaused) return;
    if (group.current) {
      group.current.children.forEach((child, i) => {
        if (!particles[i]) return;
        child.position.add(particles[i].pos.clone().multiplyScalar(particles[i].speed * delta));
        child.scale.multiplyScalar(0.93);
      });
    }
  });

  return (
    <Group ref={group} position={position}>
      {particles.map((p, i) => (
        <Mesh key={i} scale={[p.scale, p.scale, p.scale]}>
          <BoxGeometry args={[1.5, 1.5, 1.5]} />
          <MeshStandardMaterial 
            color={color || (i % 2 === 0 ? "#ff4500" : "#ffcc00")} 
            emissive={color || (i % 2 === 0 ? "#ff4500" : "#ffcc00")} 
            flatShading
          />
        </Mesh>
      ))}
    </Group>
  );
};

// Re-usable plane model component
export const PlaneModel: React.FC = () => {
  const group = useMemo(() => {
    const g = new THREE.Group();
    const fuselageGeom = new THREE.BoxGeometry(0.8, 0.8, 3);
    const fuselageMat = new THREE.MeshStandardMaterial({ color: '#e74c3c', flatShading: true });
    const fuselage = new THREE.Mesh(fuselageGeom, fuselageMat);
    fuselage.castShadow = true;
    g.add(fuselage);

    const wingGeom = new THREE.BoxGeometry(6, 0.1, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: '#ecf0f1', flatShading: true });
    const wings = new THREE.Mesh(wingGeom, wingMat);
    wings.position.y = 0.1;
    wings.castShadow = true;
    g.add(wings);

    const tailFinGeom = new THREE.BoxGeometry(0.1, 1, 0.8);
    const tailFin = new THREE.Mesh(tailFinGeom, wingMat);
    tailFin.position.set(0, 0.6, -1.2);
    tailFin.castShadow = true;
    g.add(tailFin);

    const hStabGeom = new THREE.BoxGeometry(2, 0.1, 0.6);
    const hStab = new THREE.Mesh(hStabGeom, wingMat);
    hStab.position.set(0, 0, -1.2);
    hStab.castShadow = true;
    g.add(hStab);

    // Dashboard
    const dashGeom = new THREE.BoxGeometry(0.75, 0.4, 0.1);
    const dashMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', flatShading: true });
    const dashboard = new THREE.Mesh(dashGeom, dashMat);
    dashboard.position.set(0, 0.35, 0.8);
    g.add(dashboard);

    // Compass Housing
    const compassHousingGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.04, 16);
    const compassHousingMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a' });
    const compassHousing = new THREE.Mesh(compassHousingGeom, compassHousingMat);
    compassHousing.position.set(0, 0.55, 0.85);
    g.add(compassHousing);

    // Compass Dial
    const dialGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16);
    const dialMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    const dial = new THREE.Mesh(dialGeom, dialMat);
    dial.position.set(0, 0.58, 0.85);
    dial.name = "compassDial";
    g.add(dial);

    // North Marker on dial
    const nMarkGeom = new THREE.BoxGeometry(0.01, 0.01, 0.05);
    const nMarkMat = new THREE.MeshStandardMaterial({ color: '#ff0000' });
    const nMark = new THREE.Mesh(nMarkGeom, nMarkMat);
    nMark.position.z = 0.04;
    dial.add(nMark);

    // Instrument needle (center of dial)
    const markerGeom = new THREE.BoxGeometry(0.01, 0.06, 0.01);
    const markerMat = new THREE.MeshStandardMaterial({ color: '#ff0000' });
    const marker = new THREE.Mesh(markerGeom, markerMat);
    marker.position.set(0, 0.62, 0.85);
    g.add(marker);

    const propGeom = new THREE.BoxGeometry(1.5, 0.1, 0.05);
    const propMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
    const prop = new THREE.Mesh(propGeom, propMat);
    prop.position.z = 1.55;
    prop.name = "propellerBlades";
    g.add(prop);

    const blurGeom = new THREE.CircleGeometry(0.75, 16);
    const blurMat = new THREE.MeshStandardMaterial({ color: '#2c3e50', transparent: true, opacity: 0, side: THREE.DoubleSide });
    const blurDisc = new THREE.Mesh(blurGeom, blurMat);
    blurDisc.position.z = 1.56;
    blurDisc.name = "propellerBlur";
    g.add(blurDisc);

    return g;
  }, []);

  return <Primitive object={group} />;
};

const PlayerPlane: React.FC<PlayerPlaneProps> = ({ onUpdate, onCrash, onWin, targetPos }) => {
  const planeRef = useRef<THREE.Group>(null);
  const keys = useKeyboard();
  const { camera } = useThree();

  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const rotation = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const throttle = useRef(0);
  const hasTakenOff = useRef(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [crashPos, setCrashPos] = useState(new THREE.Vector3());
  const [isFirstPerson, setIsFirstPerson] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isStalling, setIsStalling] = useState(false);
  const hullIntegrity = useRef(100);

  // Replay Recording
  const recording = useRef<ReplayFrame[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') setIsFirstPerson(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame((state, delta) => {
    if ((window as any).isPaused) return;
    if (!planeRef.current || isCrashed || hasWon) return;

    const weather = (window as any).currentWeather || 'CLEAR';
    const rotationSpeed = 1.5;
    const pitchSpeed = 1.2;
    const yawSpeed = 0.8;

    if (keys['ShiftLeft']) throttle.current = Math.min(1, throttle.current + delta * 0.4);
    if (keys['Space']) throttle.current = Math.max(0, throttle.current - delta * 0.4);

    const currentSpeed = velocity.current.length();
    const controlEfficacy = Math.min(1, currentSpeed / 10);
    
    if (keys['KeyS']) rotation.current.x -= pitchSpeed * delta * controlEfficacy;
    if (keys['KeyW']) rotation.current.x += pitchSpeed * delta * controlEfficacy;
    if (keys['KeyA']) rotation.current.z += rotationSpeed * delta * controlEfficacy;
    if (keys['KeyD']) rotation.current.z -= rotationSpeed * delta * controlEfficacy;
    if (keys['KeyQ']) rotation.current.y += yawSpeed * delta * controlEfficacy;
    if (keys['KeyE']) rotation.current.y -= yawSpeed * delta * controlEfficacy;

    const groundY = simplexNoise(planeRef.current.position.x, planeRef.current.position.z);
    const terrainHeight = Math.max(-5, groundY);
    const isOnGround = planeRef.current.position.y <= terrainHeight + 0.45;

    const aoa = -rotation.current.x; 
    const CRITICAL_AOA = 0.42; 
    const STALL_SPEED_THRESHOLD = 80;

    let stallFactor = 0;
    if (hasTakenOff.current && !isOnGround) {
      if (aoa > CRITICAL_AOA && (currentSpeed * 3.6) < STALL_SPEED_THRESHOLD) {
        stallFactor = Math.min(1, (aoa - CRITICAL_AOA) * 5 + (1 - (currentSpeed * 3.6) / STALL_SPEED_THRESHOLD));
        setIsStalling(true);
      } else {
        setIsStalling(false);
      }
    } else {
      setIsStalling(false);
    }

    if (isStalling) {
      rotation.current.x += delta * 1.5 * stallFactor;
      rotation.current.z += (Math.random() - 0.5) * delta * 2.0 * stallFactor;
    }

    if (weather === 'RAIN' && !isOnGround) {
      rotation.current.x += (Math.random() - 0.5) * 0.02 * (currentSpeed / 50);
      rotation.current.z += (Math.random() - 0.5) * 0.04;
    }

    planeRef.current.rotation.copy(rotation.current);

    const forward = new THREE.Vector3(0, 0, 1).applyEuler(planeRef.current.rotation);
    const targetSpeed = throttle.current * 75; 
    velocity.current.lerp(forward.multiplyScalar(targetSpeed), delta * 0.5);
    
    const MIN_TAKEOFF_VELOCITY = 40; 
    let liftMagnitude = 0;
    if (currentSpeed > MIN_TAKEOFF_VELOCITY) {
      const pitchFactor = 1.0 - rotation.current.x * 2.0; 
      const icingPenalty = weather === 'SNOW' ? 0.7 : 1.0;
      const stallLiftPenalty = isStalling ? (1 - stallFactor * 0.8) : 1.0;
      liftMagnitude = ((currentSpeed - MIN_TAKEOFF_VELOCITY) * 0.08) * pitchFactor * icingPenalty * stallLiftPenalty;
    }

    if (isOnGround) {
      velocity.current.y = Math.max(0, velocity.current.y);
      velocity.current.multiplyScalar(0.995);
      if (liftMagnitude > 0.3) velocity.current.y += (liftMagnitude - 0.3) * delta;
    } else {
      velocity.current.y -= 0.3 * delta; 
      velocity.current.y += liftMagnitude * delta;
    }

    planeRef.current.position.add(velocity.current.clone().multiplyScalar(delta));

    const planeY = planeRef.current.position.y;
    const distanceToGround = planeY - terrainHeight;
    const verticalVel = velocity.current.y;
    const impactForce = Math.abs(verticalVel) * 10 + (currentSpeed * 0.1);

    setIsScraping(false);

    if (distanceToGround < 0.4) {
      const tooSteep = Math.abs(rotation.current.x) > 0.6 || Math.abs(rotation.current.z) > 0.8;
      const hardImpact = impactForce > 15;

      if (hasTakenOff.current && (tooSteep || hardImpact || hullIntegrity.current <= 0)) {
        setIsCrashed(true);
        setCrashPos(planeRef.current.position.clone());
        (window as any).isCrashed = true;
        (window as any).lastRecording = recording.current;
        onCrash();
        return;
      } 
      
      if (hasTakenOff.current) {
        setIsScraping(true);
        hullIntegrity.current -= delta * 20;
        velocity.current.multiplyScalar(0.95);
        rotation.current.x *= 0.9;
        rotation.current.z *= 0.9;
        planeRef.current.position.y = terrainHeight + 0.4;
      } else {
        planeRef.current.position.y = terrainHeight + 0.4;
      }
    }

    if (!hasTakenOff.current && planeRef.current.position.y > terrainHeight + 5) hasTakenOff.current = true;

    // Prop Visuals
    const propBlades = planeRef.current.getObjectByName("propellerBlades") as THREE.Mesh;
    const propBlur = planeRef.current.getObjectByName("propellerBlur") as THREE.Mesh;
    if (propBlades && propBlur) {
        propBlades.rotation.z += throttle.current * 60 * delta;
        const blurThreshold = 0.3;
        const intensity = throttle.current > blurThreshold ? (throttle.current - blurThreshold) / (1 - blurThreshold) : 0;
        if (propBlades.material instanceof THREE.MeshStandardMaterial) {
          propBlades.material.opacity = 1 - intensity;
          propBlades.material.transparent = intensity > 0;
        }
        if (propBlur.material instanceof THREE.MeshStandardMaterial) {
          propBlur.material.opacity = intensity * 0.4;
        }
    }

    // Compass Logic
    const compassDial = planeRef.current.getObjectByName("compassDial") as THREE.Mesh;
    if (compassDial) {
      // Dial rotates opposite to plane heading to keep pointing North
      compassDial.rotation.y = -rotation.current.y;
    }

    const distToTarget = planeRef.current.position.distanceTo(targetPos);
    if (distToTarget < 25.0) { 
        setHasWon(true); 
        setCrashPos(planeRef.current.position.clone()); 
        (window as any).hasWon = true; 
        (window as any).lastRecording = recording.current;
        onWin(); 
        return;
    }

    // Camera
    const shakeBase = Math.max(0, (currentSpeed - 50) * 0.0005) + (weather === 'RAIN' ? 0.01 : 0);
    const scrapeShake = isScraping ? 0.05 : 0;
    const stallShake = isStalling ? stallFactor * 0.1 : 0;
    const shakeAmount = shakeBase + scrapeShake + stallShake;
    const shakeOffset = new THREE.Vector3((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
    
    const chaseOffset = new THREE.Vector3(0, 3, -10);
    const cockpitOffset = new THREE.Vector3(0, 0.6, 0.6);
    const chaseLookAt = new THREE.Vector3(0, 0, 5);
    const cockpitLookAt = new THREE.Vector3(0, 0.6, 10);
    
    const currentOffset = isFirstPerson ? cockpitOffset : chaseOffset;
    const currentLookAt = isFirstPerson ? cockpitLookAt : chaseLookAt;

    const idealOffset = currentOffset.clone().applyEuler(planeRef.current.rotation);
    const idealLookAt = currentLookAt.clone().applyEuler(planeRef.current.rotation);
    
    camera.position.lerp(planeRef.current.position.clone().add(idealOffset).add(shakeOffset), isFirstPerson ? 0.5 : 0.1);
    camera.lookAt(planeRef.current.position.clone().add(idealLookAt));

    onUpdate(planeRef.current.position);
    const stats = {
      speed: Math.round(currentSpeed * 3.6),
      altitude: Math.round(planeY),
      terrainAlt: Math.round(terrainHeight),
      throttle: Math.round(throttle.current * 100),
      pitch: Math.round(THREE.MathUtils.radToDeg(rotation.current.x)),
      roll: Math.round(THREE.MathUtils.radToDeg(rotation.current.z)),
      heading: Math.round(THREE.MathUtils.radToDeg(rotation.current.y) + 360) % 360,
      distToTarget: Math.round(distToTarget),
      isFirstPerson,
      hull: Math.max(0, Math.round(hullIntegrity.current)),
      isScraping,
      isStalling
    };
    (window as any).flightStats = stats;

    // RECORDING
    recording.current.push({
      position: planeRef.current.position.clone(),
      rotation: planeRef.current.rotation.clone(),
      throttle: throttle.current,
      isStalling,
      isScraping,
      speed: stats.speed,
      altitude: stats.altitude
    });
  });

  return (
    <Group>
      {!isCrashed && !hasWon ? (
        <Group ref={planeRef} position={[0, 0.4, 0]}>
          <PlaneModel />
          <ScrapeParticles active={isScraping} position={[0, -0.4, 0]} />
        </Group>
      ) : (
        <Explosion position={crashPos} color={hasWon ? "#ffd700" : undefined} intensity={hasWon ? 1.5 : 1} />
      )}
    </Group>
  );
};

export default PlayerPlane;
