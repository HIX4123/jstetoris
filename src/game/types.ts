export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type Rotation = 0 | 1 | 2 | 3;

export type GameStatus = 'ready' | 'running' | 'paused' | 'gameover';

export type TSpinType = 'none' | 'mini' | 'full';

export interface Point {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  x: number;
  y: number;
  rotation: Rotation;
  lockDelayMs: number;
  lockResets: number;
  lastAction: 'none' | 'move' | 'rotate';
  lastKickIndex: number | null;
  softDropCells: number;
  hardDropCells: number;
}

export interface HandlingConfig {
  dasMs: number;
  arrMs: number;
  sdfG: number;
}

export interface GameConfig {
  handling: HandlingConfig;
}

export interface EngineConfig {
  handling?: Partial<HandlingConfig>;
  random?: () => number;
}

export interface ScoringEvent {
  level: number;
  lines: number;
  tspin: TSpinType;
  b2bActive: boolean;
  combo: number;
  perfectClear: boolean;
  softDropCells: number;
  hardDropCells: number;
}

export interface ScoreBreakdown {
  base: number;
  b2bBonus: number;
  comboBonus: number;
  perfectClearBonus: number;
  dropBonus: number;
  total: number;
  difficult: boolean;
  keepsB2B: boolean;
}

export type GameAction =
  | { type: 'start' }
  | { type: 'togglePause' }
  | { type: 'restart' }
  | { type: 'moveLeft' }
  | { type: 'moveRight' }
  | { type: 'rotateCW' }
  | { type: 'rotateCCW' }
  | { type: 'rotate180' }
  | { type: 'hardDrop' }
  | { type: 'hold' }
  | { type: 'setHandling'; payload: HandlingConfig };

export interface GameSnapshot {
  status: GameStatus;
  boardVisible: (PieceType | null)[][];
  activeCells: Point[];
  activeType: PieceType | null;
  ghostCells: Point[];
  hold: PieceType | null;
  next: PieceType[];
  score: number;
  level: number;
  lines: number;
  goal: number;
  combo: number;
  b2bChain: number;
  handling: HandlingConfig;
}

export interface GameEngine {
  dispatch: (action: GameAction) => boolean;
  tick: (dtMs: number) => void;
  setSoftDropActive: (active: boolean) => void;
  getSnapshot: () => GameSnapshot;
  getHandling: () => HandlingConfig;
}
