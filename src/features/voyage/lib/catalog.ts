import { createId } from "@/shared/document";
import type {
  BoxKind,
  FloorMorph,
  LendColor,
  RuntimeLevel,
  TileKind,
} from "@/shared/types";

export interface RackBlueprint {
  box: number;
  color: LendColor;
  reach: number;
}

export interface LevelBlueprint {
  id: string;
  title: string;
  blurb: string;
  rows: string[];
  player: { x: number; y: number };
  boxes: { kind: BoxKind; x: number; y: number }[];
  racks: RackBlueprint[];
  plates: {
    accept: BoxKind;
    x: number;
    y: number;
    doorIds: string[];
    floorIds: string[];
  }[];
  doors: { id: string; x: number; y: number; color?: LendColor; sockets?: 1 | 2 }[];
  floors: { id: string; x: number; y: number; morph: FloorMorph }[];
}

function tilesOf(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return "wall";
      if (ch === "*") return "goal";
      if (ch === "~") return "gap";
      return "floor";
    }),
  );
}

export const LEVELS: LevelBlueprint[] = [
  {
    id: "latch-01",
    title: "门闩入门",
    blurb: "木箱压上木踏板才会开门。多出来的箱子用来压住开关。",
    rows: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "###...###",
      "#......*#",
      "#......*#",
      "#########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 3 },
      { kind: "timber", x: 4, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    racks: [],
    plates: [{ accept: "timber", x: 3, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 4, y: 5 }],
    floors: [],
  },
  {
    id: "latch-02",
    title: "认材",
    blurb: "铁踏板只认铁箱。木箱压上去门不会动。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "####...###",
      "#.......*#",
      "#.......*#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 5, y: 4 },
      { kind: "iron", x: 6, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    racks: [],
    plates: [{ accept: "iron", x: 6, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [],
  },
  {
    id: "latch-03",
    title: "架桥",
    blurb: "木踏板升起缺口上的桥板。铁箱过桥后，木箱去压本侧目标。",
    rows: [
      "###########",
      "#........*#",
      "#.........#",
      "#.........#",
      "#~~~~~~~~~#",
      "#.........#",
      "#........*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 2 },
      { kind: "iron", x: 4, y: 3 },
    ],
    racks: [],
    plates: [{ accept: "timber", x: 3, y: 3, doorIds: [], floorIds: ["b1", "b2", "b3"] }],
    doors: [],
    floors: [
      { id: "b1", x: 3, y: 4, morph: "bridge" },
      { id: "b2", x: 4, y: 4, morph: "bridge" },
      { id: "b3", x: 5, y: 4, morph: "bridge" },
    ],
  },
  {
    id: "latch-04",
    title: "封廊",
    blurb: "先把一只木箱送进左侧目标，再压踏板。踏板会封住那条廊并打开右侧的门。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "##.##..###",
      "#*......*#",
      "#........#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 6 },
      { kind: "timber", x: 4, y: 2 },
      { kind: "timber", x: 6, y: 4 },
    ],
    racks: [],
    plates: [{ accept: "timber", x: 4, y: 3, doorIds: ["d1"], floorIds: ["s1"] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [{ id: "s1", x: 2, y: 5, morph: "seal" }],
  },
  {
    id: "latch-05",
    title: "双色闸",
    blurb: "玻璃踏板与木踏板各管一扇门。两只箱子都要过闸到达目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "##...#...##",
      "#.........#",
      "#*.......*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 2 },
      { kind: "glass", x: 8, y: 2 },
      { kind: "timber", x: 3, y: 3 },
      { kind: "glass", x: 7, y: 3 },
    ],
    racks: [],
    plates: [
      { accept: "timber", x: 2, y: 3, doorIds: ["west"], floorIds: [] },
      { accept: "glass", x: 8, y: 3, doorIds: ["east"], floorIds: [] },
    ],
    doors: [
      { id: "west", x: 3, y: 4 },
      { id: "east", x: 7, y: 4 },
    ],
    floors: [],
  },
  {
    id: "lend-01",
    title: "借齿条",
    blurb: "货箱上的齿条可沿同一直线借给色门，跨距有限。钉住调借把门撑住，再穿过门去南侧压目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#####.#####",
      "#.........#",
      "#*.......*#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 1, y: 5 },
      { kind: "timber", x: 2, y: 7 },
      { kind: "timber", x: 8, y: 7 },
    ],
    racks: [{ box: 0, color: "timber", reach: 4 }],
    plates: [],
    doors: [{ id: "d1", x: 5, y: 5, color: "timber", sockets: 1 }],
    floors: [],
  },
  {
    id: "lend-02",
    title: "互抢",
    blurb: "两扇门各自都借得到，同开却抢同一根长齿条。把短齿条的货箱向西推一格腾位，长齿条就能让出来。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#####.#####",
      "#.........#",
      "#*.......*#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 1, y: 5 },
      { kind: "timber", x: 3, y: 1 },
      { kind: "timber", x: 2, y: 7 },
      { kind: "timber", x: 8, y: 7 },
    ],
    racks: [
      { box: 0, color: "timber", reach: 4 },
      { box: 1, color: "timber", reach: 1 },
    ],
    plates: [],
    doors: [
      { id: "main", x: 5, y: 5, color: "timber", sockets: 1 },
      { id: "side", x: 1, y: 1, color: "timber", sockets: 1 },
    ],
    floors: [],
  },
  {
    id: "lend-03",
    title: "长门对撑",
    blurb: "长门要两根齿条从相反方向同时撑住。它和旁门同开会互抢；把短齿条货箱向西推一格即可腾位同开。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#####.#####",
      "#.........#",
      "#*.......*#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 1, y: 5 },
      { kind: "timber", x: 9, y: 5 },
      { kind: "timber", x: 3, y: 3 },
      { kind: "timber", x: 2, y: 7 },
      { kind: "timber", x: 8, y: 7 },
    ],
    racks: [
      { box: 0, color: "timber", reach: 4 },
      { box: 1, color: "timber", reach: 4 },
      { box: 2, color: "timber", reach: 1 },
    ],
    plates: [],
    doors: [
      { id: "long", x: 5, y: 5, color: "timber", sockets: 2 },
      { id: "side", x: 1, y: 3, color: "timber", sockets: 1 },
    ],
    floors: [],
  },
];

export function getLevel(id: string): LevelBlueprint {
  const found = LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`未知关卡 ${id}`);
  return found;
}

export function hydrate(blueprint: LevelBlueprint): RuntimeLevel {
  const boxes = blueprint.boxes.map((box) => ({ ...box, id: createId(box.kind) }));
  return {
    id: blueprint.id,
    title: blueprint.title,
    blurb: blueprint.blurb,
    width: blueprint.rows[0].length,
    height: blueprint.rows.length,
    tiles: tilesOf(blueprint.rows),
    player: { ...blueprint.player },
    boxes,
    racks: blueprint.racks.map((rack, index) => ({
      id: `r-${blueprint.id}-${index}`,
      boxId: boxes[rack.box].id,
      color: rack.color,
      reach: rack.reach,
    })),
    plates: blueprint.plates.map((plate, index) => ({
      ...plate,
      id: `p-${blueprint.id}-${index}`,
      powered: false,
    })),
    doors: blueprint.doors.map((door) => ({
      ...door,
      color: door.color,
      sockets: door.sockets ?? 1,
      open: false,
    })),
    floors: blueprint.floors.map((floor) => ({ ...floor, active: false })),
  };
}
