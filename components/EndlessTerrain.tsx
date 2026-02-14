
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

// Fix: Define intrinsic elements as components to resolve JSX type errors
const Mesh = 'mesh' as any;
const Group = 'group' as any;
const PlaneGeometry = 'planeGeometry' as any;
const MeshStandardMaterial = 'meshStandardMaterial' as any;
const BoxGeometry = 'boxGeometry' as any;

// Noise function identical to PlayerPlane
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

interface EndlessTerrainProps {
  playerPosition: THREE.Vector3;
}

const CHUNK_SIZE = 200;
const GRID_SIZE = 40; 

const TerrainChunk: React.FC<{ x: number; z: number }> = ({ x, z }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, GRID_SIZE, GRID_SIZE);
    geo.rotateX(-Math.PI / 2);
    
    const vertices = geo.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const vx = vertices[i] + x;
      const vz = vertices[i + 2] + z;
      const height = simplexNoise(vx, vz);
      vertices[i + 1] = height < -5 ? -5 : height;
    }
    geo.computeVertexNormals();
    return geo;
  }, [x, z]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#27ae60',
      flatShading: true,
      roughness: 0.9,
    });
  }, []);

  return (
    <Mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={[x, 0, z]}
      receiveShadow
    />
  );
};

const EndlessTerrain: React.FC<EndlessTerrainProps> = ({ playerPosition }) => {
  const chunks = useMemo(() => {
    const range = 2; 
    const list = [];
    const centerX = Math.floor(playerPosition.x / CHUNK_SIZE) * CHUNK_SIZE;
    const centerZ = Math.floor(playerPosition.z / CHUNK_SIZE) * CHUNK_SIZE;

    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        const cx = centerX + i * CHUNK_SIZE;
        const cz = centerZ + j * CHUNK_SIZE;
        list.push({ id: `${cx}-${cz}`, x: cx, z: cz });
      }
    }
    return list;
  }, [Math.floor(playerPosition.x / CHUNK_SIZE), Math.floor(playerPosition.z / CHUNK_SIZE)]);

  return (
    <Group>
      {chunks.map((chunk) => (
        <TerrainChunk key={chunk.id} x={chunk.x} z={chunk.z} />
      ))}
      
      {/* Runway Visualization at [0, 0] */}
      <Mesh position={[0, 0.05, 0]}>
        <BoxGeometry args={[10, 0.1, 300]} />
        <MeshStandardMaterial color="#333333" flatShading={true} />
      </Mesh>
      {/* Runway Markings */}
      {[...Array(10)].map((_, i) => (
        <Mesh key={i} position={[0, 0.06, (i - 5) * 50]}>
            <BoxGeometry args={[0.5, 0.1, 10]} />
            <MeshStandardMaterial color="#ffffff" />
        </Mesh>
      ))}
      
      {/* Water Plane */}
      <Mesh rotation={[-Math.PI / 2, 0, 0]} position={[playerPosition.x, -2, playerPosition.z]} receiveShadow>
        <PlaneGeometry args={[CHUNK_SIZE * 6, CHUNK_SIZE * 6]} />
        <MeshStandardMaterial color="#3498db" transparent opacity={0.6} />
      </Mesh>
    </Group>
  );
};

export default EndlessTerrain;
