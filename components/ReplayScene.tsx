
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PlaneModel, ReplayFrame } from './PlayerPlane';
import EndlessTerrain from './EndlessTerrain';

const Group = 'group' as any;

interface ReplaySceneProps {
  recording: ReplayFrame[];
  onFinish: () => void;
}

const ReplayScene: React.FC<ReplaySceneProps> = ({ recording, onFinish }) => {
  const { camera } = useThree();
  const planeRef = useRef<THREE.Group>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [cameraMode, setCameraMode] = useState<'CHASE' | 'COCKPIT' | 'FLYBY' | 'STATIC'>('CHASE');
  
  const flybyCamPos = useMemo(() => new THREE.Vector3(), []);
  const staticCamPos = useMemo(() => {
      // Find a spot near the middle of the flight
      if (recording.length === 0) return new THREE.Vector3(50, 50, 50);
      const mid = recording[Math.floor(recording.length * 0.5)];
      return mid.position.clone().add(new THREE.Vector3(30, 15, 30));
  }, [recording]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Digit1') setCameraMode('CHASE');
      if (e.code === 'Digit2') setCameraMode('COCKPIT');
      if (e.code === 'Digit3') setCameraMode('FLYBY');
      if (e.code === 'Digit4') setCameraMode('STATIC');
      if (e.code === 'KeyV') {
          setCameraMode(prev => {
              if (prev === 'CHASE') return 'COCKPIT';
              if (prev === 'COCKPIT') return 'FLYBY';
              if (prev === 'FLYBY') return 'STATIC';
              return 'CHASE';
          });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useFrame((state, delta) => {
    if (frameIndex >= recording.length - 1) {
      // Hold last frame for a moment then finish or just stop
      return;
    }

    const currentFrame = recording[frameIndex];
    if (planeRef.current) {
      planeRef.current.position.copy(currentFrame.position);
      planeRef.current.rotation.copy(currentFrame.rotation);

      // Prop animation
      const propBlades = planeRef.current.getObjectByName("propellerBlades") as THREE.Mesh;
      const propBlur = planeRef.current.getObjectByName("propellerBlur") as THREE.Mesh;
      if (propBlades && propBlur) {
          propBlades.rotation.z += currentFrame.throttle * 60 * delta;
          const blurThreshold = 0.3;
          const intensity = currentFrame.throttle > blurThreshold ? (currentFrame.throttle - blurThreshold) / (1 - blurThreshold) : 0;
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
        compassDial.rotation.y = -currentFrame.rotation.y;
      }
    }

    // Update global stats for HUD
    (window as any).flightStats = {
        ...currentFrame,
        replayMode: cameraMode,
        isReplaying: true,
        progress: (frameIndex / recording.length) * 100,
        heading: Math.round(THREE.MathUtils.radToDeg(currentFrame.rotation.y) + 360) % 360
    };

    // Camera Logic
    const planePos = currentFrame.position;
    const planeRot = currentFrame.rotation;

    if (cameraMode === 'CHASE') {
      const offset = new THREE.Vector3(0, 3, -10).applyEuler(planeRot);
      const lookAt = new THREE.Vector3(0, 0, 5).applyEuler(planeRot);
      camera.position.lerp(planePos.clone().add(offset), 0.1);
      camera.lookAt(planePos.clone().add(lookAt));
    } else if (cameraMode === 'COCKPIT') {
      const offset = new THREE.Vector3(0, 0.6, 0.6).applyEuler(planeRot);
      const lookAt = new THREE.Vector3(0, 0.6, 10).applyEuler(planeRot);
      camera.position.copy(planePos.clone().add(offset));
      camera.lookAt(planePos.clone().add(lookAt));
    } else if (cameraMode === 'FLYBY') {
      // Flyby logic: Camera stays fixed relative to a point ahead, then plane flies past
      // Reset position every 100 frames
      if (frameIndex % 150 === 0) {
          const futureFrame = recording[Math.min(frameIndex + 100, recording.length - 1)];
          flybyCamPos.copy(futureFrame.position).add(new THREE.Vector3(15, 5, 15));
      }
      camera.position.lerp(flybyCamPos, 0.05);
      camera.lookAt(planePos);
    } else if (cameraMode === 'STATIC') {
      camera.position.lerp(staticCamPos, 0.05);
      camera.lookAt(planePos);
    }

    setFrameIndex(prev => prev + 1);
  });

  return (
    <Group>
      <Group ref={planeRef}>
        <PlaneModel />
      </Group>
      <EndlessTerrain playerPosition={recording[frameIndex]?.position || new THREE.Vector3()} />
    </Group>
  );
};

export default ReplayScene;
