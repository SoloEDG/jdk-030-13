import type { Box, BraceSide, Door, GameDocument, Rack } from "@/shared/types";

/** 一根齿条对一扇门的一个可行撑点。 */
export interface BraceOption {
  rackId: string;
  boxId: string;
  side: BraceSide;
  distance: number;
  reach: number;
}

export const OPPOSITE: Record<BraceSide, BraceSide> = {
  n: "s",
  s: "n",
  e: "w",
  w: "e",
};

export const SIDE_LABEL: Record<BraceSide, string> = {
  n: "北侧",
  e: "东侧",
  s: "南侧",
  w: "西侧",
};

function boxOf(level: GameDocument["level"], boxId: string): Box | undefined {
  return level.boxes.find((item) => item.id === boxId);
}

/**
 * 齿条与门必须在同一横/纵直线上，跨距不超过齿条 reach。
 * 一根齿条一次只跨这一段，方向由货箱相对门的位置决定。
 */
export function braceOption(
  level: GameDocument["level"],
  rack: Rack,
  door: Door,
): BraceOption | null {
  if (rack.color !== door.color) return null;
  const box = boxOf(level, rack.boxId);
  if (!box) return null;
  if (box.x === door.x && box.y === door.y) return null;
  let side: BraceSide;
  if (box.x === door.x) {
    side = box.y < door.y ? "n" : "s";
  } else if (box.y === door.y) {
    side = box.x < door.x ? "w" : "e";
  } else {
    return null;
  }
  const distance = Math.abs(box.x - door.x) + Math.abs(box.y - door.y);
  if (distance < 1 || distance > rack.reach) return null;
  return { rackId: rack.id, boxId: rack.boxId, side, distance, reach: rack.reach };
}

/** 每扇色门当前可用的全部撑点。 */
export function doorOptions(
  level: GameDocument["level"],
): Map<string, BraceOption[]> {
  const result = new Map<string, BraceOption[]>();
  for (const door of level.doors) {
    if (!door.color) continue;
    const options: BraceOption[] = [];
    for (const rack of level.racks) {
      const option = braceOption(level, rack, door);
      if (option) options.push(option);
    }
    result.set(door.id, options);
  }
  return result;
}
