import { boxAt } from "./occupancy";
import { isPassable } from "@/features/gadget";
import { addVec, cloneDocument } from "@/shared/document";
import { DIR_VEC, type Dir, type GameDocument, type MoveResult } from "@/shared/types";

/** 移动前的借调预检：拿到“落子后”的完整草稿与目标格，返回是否放行。 */
export type MoveGate = (
  draft: GameDocument,
  targetX: number,
  targetY: number,
) => { allow: boolean; reason?: string };

export function applyMove(
  document: GameDocument,
  dir: Dir,
  gate?: MoveGate,
): MoveResult {
  if (document.attempt.status === "cleared") return { moved: false, pushed: false, reason: "cleared" };
  const delta = DIR_VEC[dir];
  const next = addVec(document.level.player, delta);
  const box = boxAt(document, next);
  if (box) {
    const beyond = addVec(box, delta);
    if (!isPassable(document, beyond, { ignoreBoxId: box.id, ignorePlayer: true })) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    const draft = cloneDocument(document);
    const draftBox = draft.level.boxes.find((item) => item.id === box.id);
    if (draftBox) {
      draftBox.x = beyond.x;
      draftBox.y = beyond.y;
    }
    draft.level.player = next;
    const verdict = gate?.(draft, next.x, next.y) ?? { allow: true };
    if (!verdict.allow) {
      return { moved: false, pushed: false, reason: "blocked", gateReason: verdict.reason };
    }
    box.x = beyond.x;
    box.y = beyond.y;
    document.level.player = next;
    return { moved: true, pushed: true, boxId: box.id };
  }
  if (!isPassable(document, next)) return { moved: false, pushed: false, reason: "blocked" };
  const draft = cloneDocument(document);
  draft.level.player = next;
  const verdict = gate?.(draft, next.x, next.y) ?? { allow: true };
  if (!verdict.allow) {
    return { moved: false, pushed: false, reason: "blocked", gateReason: verdict.reason };
  }
  document.level.player = next;
  return { moved: true, pushed: false };
}
