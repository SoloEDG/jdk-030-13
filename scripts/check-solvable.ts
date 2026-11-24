/**
 * 通关可达性校验：对借调关做有界 BFS。
 * 轻量状态只存 (玩家, 箱子坐标, 钉住调借)，门状态由调借即时推导，避免整份文档克隆爆内存。
 * 转换：走一步（含推动、色门、借调原子预检），或在规划盘重新钉住目标门组。
 * 运行：node --experimental-strip-types --loader ./scripts/alias-loader.mjs scripts/check-solvable.ts
 */
import { hydrate, LEVELS } from "../src/features/voyage/lib/catalog.ts";
import { applyMove } from "../src/features/hauler/lib/push.ts";
import { evaluateGadgets } from "../src/features/gadget/lib/power.ts";
import { loansFor } from "../src/features/lending/lib/match.ts";
import { syncLending } from "../src/features/lending/lib/runtime.ts";
import type { Dir, GameDocument, Loan, Vec } from "../src/shared/types.ts";

const DIRS: Dir[] = ["n", "e", "s", "w"];
const NODES_LIMIT = 300000;

interface LightState {
  player: Vec;
  boxes: Vec[];
  pinKey: string;
  steps: number;
}

function pinKeyOf(pinned: Loan[]): string {
  return pinned
    .map((loan) => `${loan.rackId}>${loan.doorId}:${loan.side}`)
    .sort()
    .join("|");
}

function stateKey(state: LightState): string {
  const boxes = state.boxes.map((box) => `${box.x},${box.y}`).sort().join("|");
  return `${state.player.x},${state.player.y}#${boxes}#${state.pinKey}`;
}

/** 用轻量状态还原一份完整文档（门状态由当前调借推导）。 */
function materialize(base: GameDocument, state: LightState): GameDocument {
  const doc = structuredClone(base);
  doc.level.player = { ...state.player };
  state.boxes.forEach((pos, index) => {
    doc.level.boxes[index].x = pos.x;
    doc.level.boxes[index].y = pos.y;
  });
  evaluateGadgets(doc);
  const pinned = state.pinKey
    ? state.pinKey.split("|").map((chunk) => {
        const [rackId, rest] = chunk.split(">");
        const [doorId, side] = rest.split(":");
        return { rackId, doorId, side: side as Dir };
      })
    : [];
  syncLending(doc, pinned);
  return { doc, pinned };
}

function goalFilled(doc: GameDocument): [number, number] {
  let total = 0;
  let filled = 0;
  for (let y = 0; y < doc.level.height; y++) {
    for (let x = 0; x < doc.level.width; x++) {
      if (doc.level.tiles[y][x] !== "goal") continue;
      total += 1;
      if (doc.level.boxes.some((box) => box.x === x && box.y === y)) filled += 1;
    }
  }
  return [filled, total];
}

function solve(id: string, pinDoorIds: string[]): { ok: boolean; nodes: number; steps: number; detail: string } {
  const base: GameDocument = {
    version: 1,
    currentLevelId: id,
    level: hydrate(LEVELS.find((level) => level.id === id)!),
    attempt: { steps: 0, status: "playing" },
    records: {},
  };
  evaluateGadgets(base);
  const start: LightState = {
    player: { ...base.level.player },
    boxes: base.level.boxes.map((box) => ({ x: box.x, y: box.y })),
    pinKey: "",
    steps: 0,
  };
  const queue: LightState[] = [start];
  const seen = new Set<string>([stateKey(start)]);
  let nodes = 0;
  let bestRatio = 0;

  while (queue.length) {
    const state = queue.shift()!;
    nodes += 1;
    const { doc, pinned } = materialize(base, state);
    const [filled, total] = goalFilled(doc);
    bestRatio = Math.max(bestRatio, filled / Math.max(1, total));
    if (total > 0 && filled === total) {
      return { ok: true, nodes, steps: state.steps, detail: "" };
    }
    if (nodes > NODES_LIMIT) {
      return { ok: false, nodes, steps: -1, detail: `最高目标覆盖 ${(bestRatio * 100).toFixed(0)}%` };
    }

    // 转换一：重新钉住目标门组。
    const repin = loansFor(doc, pinDoorIds);
    if (repin.ok) {
      const next: LightState = { ...state, pinKey: pinKeyOf(repin.loans) };
      const k = stateKey(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }

    // 转换二：走一步，借调原子预检通过才允许。
    for (const dir of DIRS) {
      const draft = structuredClone(doc);
      const result = applyMove(draft, dir, (candidate, tx, ty) => {
        const sync = syncLending(candidate, pinned);
        const blocked = candidate.level.doors.find(
          (door) => door.x === tx && door.y === ty && door.color && !door.open,
        );
        if (blocked && !sync.audit.ok) return { allow: false };
        return { allow: true };
      });
      if (!result.moved) continue;
      const next: LightState = {
        player: { ...draft.level.player },
        boxes: draft.level.boxes.map((box) => ({ x: box.x, y: box.y })),
        pinKey: state.pinKey,
        steps: state.steps + 1,
      };
      const k = stateKey(next);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push(next);
    }
  }
  return { ok: false, nodes, steps: -1, detail: "队列耗尽" };
}

const cases: [string, string[]][] = [
  ["lend-01", ["d1"]],
  ["lend-02", ["main", "side"]],
  ["lend-03", ["long", "side"]],
];

let failures = 0;
for (const [id, pins] of cases) {
  const result = solve(id, pins);
  const label = `${id} 钉住 [${pins.join(", ")}]`;
  if (result.ok) {
    console.log(`  ✓ ${label} 可通关，探索 ${result.nodes} 个局面，${result.steps} 步`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label} 未能在 ${result.nodes} 个局面内通关；${result.detail}`);
  }
}
console.log(failures === 0 ? "\n全部可通关" : `\n${failures} 关不可通关`);
process.exit(failures === 0 ? 0 : 1);
