import { braceOption, doorOptions, OPPOSITE, type BraceOption } from "./geometry";
import type { Door, GameDocument, Loan, LoanAudit, RuntimeLevel } from "@/shared/types";

export interface DoorPlan {
  doorId: string;
  feasible: boolean;
  /** 该门单独可开时的一整套调借（长门为一对对撑）。 */
  options: BraceOption[];
}

interface DemandGroup {
  doorId: string;
  options: BraceOption[];
}

/** 把一扇门展开成若干“需求组”：长门每组必须是异侧对撑的两根齿条。 */
function groupsFor(door: Door, options: BraceOption[]): DemandGroup[] {
  if ((door.sockets ?? 1) === 1) {
    return options.map((option) => ({ doorId: door.id, options: [option] }));
  }
  const groups: DemandGroup[] = [];
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const a = options[i];
      const b = options[j];
      if (a.rackId === b.rackId) continue;
      if (OPPOSITE[a.side] !== b.side) continue;
      groups.push({ doorId: door.id, options: [a, b] });
    }
  }
  return groups;
}

/**
 * 判断一组门能否同时被撑住。
 * 每扇门展开成若干需求组（长门的组必须是异侧对撑的两根齿条），
 * 再以“门→需求组→齿条”做 Kuhn 增广路：齿条全局只许占用一次，
 * 冲突时递归请占用者换组。“各自借得到”不等于“这组借得到”。
 */
export function planDoors(
  level: RuntimeLevel,
  doorIds: string[],
): { feasible: boolean; assignments: Map<string, BraceOption[]> } {
  const all = doorOptions(level);
  const groupsByDoor = new Map<string, DemandGroup[]>();
  for (const door of level.doors) {
    if (!doorIds.includes(door.id)) continue;
    groupsByDoor.set(door.id, groupsFor(door, all.get(door.id) ?? []));
  }

  // rackId -> 当前占用它的门
  const rackOwner = new Map<string, string>();
  const chosenGroup = new Map<string, BraceOption[]>();
  // 每轮增广中已尝试过的齿条，避免环上死循环。
  const seenRacks = new Set<string>();

  function augment(doorId: string): boolean {
    const groups = groupsByDoor.get(doorId) ?? [];
    for (const group of groups) {
      if (group.options.some((option) => seenRacks.has(option.rackId))) continue;
      for (const option of group.options) seenRacks.add(option.rackId);
      const owners = [
        ...new Set(
          group.options
            .map((option) => rackOwner.get(option.rackId))
            .filter((owner): owner is string => owner != null && owner !== doorId),
        ),
      ];
      if (owners.every((owner) => augment(owner))) {
        for (const option of group.options) rackOwner.set(option.rackId, doorId);
        chosenGroup.set(doorId, group.options);
        return true;
      }
    }
    return false;
  }

  for (const doorId of doorIds) {
    seenRacks.clear();
    if (!augment(doorId)) {
      return { feasible: false, assignments: new Map() };
    }
  }
  return { feasible: true, assignments: new Map(chosenGroup) };
}

/** 单扇门是否能开，以及一组具体调借实例。 */
export function planSingle(level: RuntimeLevel, door: Door): DoorPlan {
  const result = planDoors(level, [door.id]);
  return {
    doorId: door.id,
    feasible: result.feasible,
    options: result.assignments.get(door.id) ?? [],
  };
}

/**
 * 对一笔记好的调借做原子校验：颜色、直线跨距、齿条唯一性、长门异侧对撑。
 * 搬箱后整笔重算，任一门眼借不齐就整体拒收——不会先放行再补报。
 */
export function auditLoans(level: RuntimeLevel, loans: Loan[]): LoanAudit {
  const rejects: { doorId: string; reason: string }[] = [];
  const racks = new Map(level.racks.map((rack) => [rack.id, rack]));
  const doorMap = new Map(level.doors.map((door) => [door.id, door]));
  const seenRack = new Map<string, string>();
  const byDoor = new Map<string, BraceOption[]>();

  for (const loan of loans) {
    const rack = racks.get(loan.rackId);
    const door = doorMap.get(loan.doorId);
    if (!rack || !door || !door.color) {
      rejects.push({ doorId: loan.doorId, reason: "齿条或门已不在盘上" });
      continue;
    }
    const owner = seenRack.get(loan.rackId);
    if (owner) {
      rejects.push({
        doorId: loan.doorId,
        reason: `齿条已先借给门 ${owner}，一根齿条一次只能撑一扇门`,
      });
      continue;
    }
    const option = braceOption(level, rack, door);
    if (!option) {
      rejects.push({ doorId: loan.doorId, reason: "颜色不符，或已不在同一直线的可达跨距内" });
      continue;
    }
    if (option.side !== loan.side) {
      rejects.push({ doorId: loan.doorId, reason: "对撑方向与当前货箱位置不符" });
      continue;
    }
    seenRack.set(loan.rackId, door.id);
    const list = byDoor.get(door.id) ?? [];
    list.push(option);
    byDoor.set(door.id, list);
  }

  for (const [doorId, options] of byDoor) {
    const door = doorMap.get(doorId);
    if (!door) continue;
    const need = door.sockets ?? 1;
    if (options.length !== need) {
      rejects.push({
        doorId,
        reason: `需要 ${need} 个门眼同时撑住，实际只有 ${options.length} 个`,
      });
      continue;
    }
    if (need === 2 && OPPOSITE[options[0].side] !== options[1].side) {
      rejects.push({ doorId, reason: "长门必须由相反方向的两根齿条同时对撑" });
    }
  }
  return { ok: rejects.length === 0, loans, rejects };
}

/** 由一组门生成一笔可落地的调借（供“钉住这组”使用）。 */
export function loansFor(
  document: GameDocument,
  doorIds: string[],
): { ok: boolean; loans: Loan[] } {
  const result = planDoors(document.level, doorIds);
  if (!result.feasible) return { ok: false, loans: [] };
  const loans: Loan[] = [];
  for (const [doorId, options] of result.assignments) {
    for (const option of options) {
      loans.push({ rackId: option.rackId, doorId, side: option.side });
    }
  }
  return { ok: true, loans };
}
