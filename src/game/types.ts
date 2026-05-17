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

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  lines: number;
  createdAt: number;
}

export interface GameConfig {
  handling: HandlingConfig;
}

export interface EngineConfig {
  handling?: Partial<HandlingConfig>;
  random?: () => number;
  initialBoard?: (PieceType | null)[][];
}

export interface AttackEvent {
  lines: number;
  tspin: TSpinType;
  b2bActive: boolean;
  combo: number;
  perfectClear: boolean;
  surgeAttack: number;
}

export interface AttackBreakdown {
  baseAttack: number;
  comboAttack: number;
  b2bAttack: number;
  allClearAttack: number;
  surgeAttack: number;
  total: number;
  difficult: boolean;
  keepsB2B: boolean;
}

export interface ScoringEvent {
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
  allClearBonus: number;
  dropBonus: number;
  total: number;
  difficult: boolean;
  keepsB2B: boolean;
}

export interface ClearFeedback {
  id: number;
  lines: 1 | 2 | 3 | 4;
  tspin: TSpinType;
  perfectClear: boolean;
  attack: number;
  combo: number;
  b2bChain: number;
  difficult: boolean;
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
  lines: number;
  gravityG: number;
  marginMsRemaining: number;
  marginElapsedMs: number;
  combo: number;
  b2bChain: number;
  lastClearFeedback: ClearFeedback | null;
  handling: HandlingConfig;
}

export interface GameEngine {
  dispatch: (action: GameAction) => boolean;
  tick: (dtMs: number) => void;
  setSoftDropActive: (active: boolean) => void;
  getSnapshot: () => GameSnapshot;
  getHandling: () => HandlingConfig;
}
