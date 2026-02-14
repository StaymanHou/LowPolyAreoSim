
export interface FlightStats {
  speed: number;
  altitude: number;
  pitch: number;
  roll: number;
  throttle: number;
  heading: number;
}

export interface TerrainChunk {
  id: string;
  position: [number, number, number];
}

export enum GameStatus {
  IDLE = 'IDLE',
  FLYING = 'FLYING',
  CRASHED = 'CRASHED'
}
