export type Dir = "n" | "e" | "s" | "w";
export type TileKind = "wall" | "floor" | "goal" | "gap";
export type BoxKind = "timber" | "iron" | "glass";
export type FloorMorph = "bridge" | "seal";
export type AttemptStatus = "playing" | "cleared";

/** 齿条与门共认的颜色，和箱材同源。 */
export type LendColor = BoxKind;
/** 齿条上门的相对方向。 */
export type BraceSide = Dir;

export interface Vec {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  kind: BoxKind;
  x: number;
  y: number;
}

/** 货箱上的一根有限齿条：有颜色、有跨距，一次只能借出给一扇门。 */
export interface Rack {
  id: string;
  boxId: string;
  color: LendColor;
  /** 最多能跨过的格数（同一直线、曼哈顿距离）。 */
  reach: number;
}

/** 一笔已经钉下的调借：某根齿条沿某一方向撑住某扇门的一个门眼。 */
export interface Loan {
  rackId: string;
  doorId: string;
  side: BraceSide;
}

export interface Plate {
  id: string;
  x: number;
  y: number;
  accept: BoxKind;
  doorIds: string[];
  floorIds: string[];
  powered: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  open: boolean;
  /** 门眼颜色；缺省（旧关）视为踏板供电，不参与齿条借调。 */
  color?: LendColor;
  /** 需要同时撑住的门眼数；长门为 2，且两个门眼方向相反。 */
  sockets?: 1 | 2;
}

export interface FloorPatch {
  id: string;
  x: number;
  y: number;
  morph: FloorMorph;
  active: boolean;
}

export interface RuntimeLevel {
  id: string;
  title: string;
  blurb: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  player: Vec;
  boxes: Box[];
  racks: Rack[];
  plates: Plate[];
  doors: Door[];
  floors: FloorPatch[];
}

/** 一次借调校验的结果：可同时生效的调借与被拒收的原因。 */
export interface LoanAudit {
  ok: boolean;
  loans: Loan[];
  rejects: { doorId: string; reason: string }[];
}

export interface Attempt {
  steps: number;
  status: AttemptStatus;
}

export interface LevelRecord {
  bestSteps: number;
  clearedAt: number;
}

export interface GameDocument {
  version: 1;
  currentLevelId: string;
  level: RuntimeLevel;
  attempt: Attempt;
  records: Record<string, LevelRecord>;
}

export interface MoveResult {
  moved: boolean;
  pushed: boolean;
  boxId?: string;
  reason?: "blocked" | "cleared" | "idle";
  /** 借调预检拦下时的说明。 */
  gateReason?: string;
}

export const BOX_LABEL: Record<BoxKind, string> = {
  timber: "木箱",
  iron: "铁箱",
  glass: "玻璃箱",
};

export const DIR_VEC: Record<Dir, Vec> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};
