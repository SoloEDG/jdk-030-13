import { auditLoans } from "./match";
import type { Door, GameDocument, Loan } from "@/shared/types";

/** 色门：由齿条调借驱动；无色旧门：仍由踏板供电驱动。 */
export function isLendingDoor(door: Door): boolean {
  return Boolean(door.color);
}

export interface LendingSync {
  audit: { ok: boolean; rejects: { doorId: string; reason: string }[] };
  /** 本步被同步收回的门（箱已搬走、借不齐）。 */
  withdrawn: string[];
}

/**
 * 按钉住的调借重算色门开合，与通行在同一步内生效：
 * 先整笔校验，再一次性写门状态——借不齐就整组收回，不会出现“先穿后报”。
 */
export function syncLending(document: GameDocument, pinned: Loan[]): LendingSync {
  const audit = auditLoans(document.level, pinned);
  const powered = new Set(audit.ok ? pinned.map((loan) => loan.doorId) : []);
  const withdrawn: string[] = [];
  for (const door of document.level.doors) {
    if (!isLendingDoor(door)) continue;
    const next = powered.has(door.id);
    if (door.open && !next) withdrawn.push(door.id);
    door.open = next;
  }
  return { audit: { ok: audit.ok, rejects: audit.rejects }, withdrawn };
}

/** 试图穿过的格子上是否有关着的色门（用于“借不齐即禁止通行”）。 */
export function closedLendingDoorAt(
  document: GameDocument,
  x: number,
  y: number,
): Door | undefined {
  return document.level.doors.find(
    (door) => door.x === x && door.y === y && isLendingDoor(door) && !door.open,
  );
}
