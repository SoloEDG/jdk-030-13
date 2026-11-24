import { planDoors, planSingle, type DoorPlan } from "./match";
import { SIDE_LABEL, type BraceOption } from "./geometry";
import type { Door, GameDocument, RuntimeLevel } from "@/shared/types";

export interface DoorReport {
  door: Door;
  alone: DoorPlan;
  selected: boolean;
}

export interface ConflictReport {
  /** 再少任一扇就成立的冲突门集（包含意义下的极小集）。 */
  minimal: Door[];
  /** 去掉其中哪扇后整组即可同开。 */
  removable: Door[];
}

export interface PlanAnalysis {
  doors: DoorReport[];
  selectedIds: string[];
  jointFeasible: boolean;
  conflict: ConflictReport | null;
}

/**
 * 求一个极小冲突门集：从当前选中门出发逐扇试探，
 * 删一扇后若仍冲突就真的删掉，最终剩下的集合任删一扇都可成立。
 */
export function findConflict(level: RuntimeLevel, doorIds: string[]): ConflictReport {
  const doorMap = new Map(level.doors.map((door) => [door.id, door]));
  let core = [...doorIds];
  for (const candidate of doorIds) {
    if (!core.includes(candidate)) continue;
    const trial = core.filter((id) => id !== candidate);
    if (!planDoors(level, trial).feasible) core = trial;
  }
  const removable = core
    .filter((id) => planDoors(level, core.filter((other) => other !== id)).feasible)
    .map((id) => doorMap.get(id)!)
    .filter(Boolean);
  return { minimal: core.map((id) => doorMap.get(id)!).filter(Boolean), removable };
}

export function analyzePlan(
  document: GameDocument,
  selectedIds: string[],
): PlanAnalysis {
  const { level } = document;
  const doors = level.doors
    .filter((door) => door.color)
    .map((door) => ({
      door,
      alone: planSingle(level, door),
      selected: selectedIds.includes(door.id),
    }));
  const joint = planDoors(level, selectedIds);
  return {
    doors,
    selectedIds,
    jointFeasible: selectedIds.length === 0 || joint.feasible,
    conflict: joint.feasible || selectedIds.length === 0 ? null : findConflict(level, selectedIds),
  };
}

export interface WitnessLine {
  rackId: string;
  boxId: string;
  doorId: string;
  side: BraceOption["side"];
  distance: number;
  reach: number;
  text: string;
}

/** 单扇门的完整调借实例，带上门号。 */
export function doorWitness(document: GameDocument, door: Door): WitnessLine[] {
  const plan = planSingle(document.level, door);
  return plan.options.map((option) => ({
    rackId: option.rackId,
    boxId: option.boxId,
    doorId: door.id,
    side: option.side,
    distance: option.distance,
    reach: option.reach,
    text: `${option.rackId} 跨 ${option.distance} 格（上限 ${option.reach}），从${SIDE_LABEL[option.side]}撑住门 ${door.id}`,
  }));
}
