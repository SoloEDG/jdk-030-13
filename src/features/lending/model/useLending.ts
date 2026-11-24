import { computed, ref, type Ref } from "vue";
import { analyzePlan, doorWitness, type PlanAnalysis } from "../lib/analysis";
import { loansFor } from "../lib/match";
import { closedLendingDoorAt, syncLending, type LendingSync } from "../lib/runtime";
import type { GameDocument, Loan } from "@/shared/types";

export function useLending(document: Ref<GameDocument>) {
  /** 规划盘上勾选、准备一起过的门。 */
  const selectedIds = ref<string[]>([]);
  /** 已经钉下、随每一步原子重算的调借。 */
  const pinned = ref<Loan[]>([]);
  /** 点门查看调借实例时选中的门。 */
  const inspectedId = ref<string | null>(null);
  /** 最近一次同步收回的门与拒收原因。 */
  const lastSync = ref<LendingSync | null>(null);

  const hasLending = computed(() => document.value.level.racks.length > 0);
  const analysis = computed<PlanAnalysis>(() =>
    analyzePlan(document.value, selectedIds.value),
  );
  const inspectedDoor = computed(() =>
    document.value.level.doors.find((door) => door.id === inspectedId.value) ?? null,
  );
  const inspectedWitness = computed(() =>
    inspectedDoor.value ? doorWitness(document.value, inspectedDoor.value) : [],
  );
  const pinnedDoors = computed(() =>
    [...new Set(pinned.value.map((loan) => loan.doorId))],
  );

  function toggleDoor(doorId: string): void {
    selectedIds.value = selectedIds.value.includes(doorId)
      ? selectedIds.value.filter((id) => id !== doorId)
      : [...selectedIds.value, doorId];
  }

  function inspect(doorId: string): void {
    inspectedId.value = inspectedId.value === doorId ? null : doorId;
  }

  /** 钉住当前这组门的一套可行调借；冲突时不允许钉。 */
  function pinSelected(): { ok: boolean; message: string } {
    const built = loansFor(document.value, selectedIds.value);
    if (!built.ok) {
      return { ok: false, message: "这组门借不齐，先按冲突提示减少一扇再钉。" };
    }
    pinned.value = built.loans;
    lastSync.value = syncLending(document.value, pinned.value);
    return { ok: true, message: `已钉住 ${selectedIds.value.length} 扇门的调借，搬箱时会整组重算。` };
  }

  function unpin(): void {
    pinned.value = [];
    lastSync.value = syncLending(document.value, pinned.value);
  }

  function resetForLevel(): void {
    selectedIds.value = [];
    pinned.value = [];
    inspectedId.value = null;
    lastSync.value = null;
  }

  /**
   * 移动前预检：在“移动后”的草稿上重算调借（推箱时草稿里的箱子也已挪位）。
   * 若目标格是色门且新位置下钉住的调借已借不齐，则禁止这一步——
   * 收回与通行同时生效，不允许先穿门再报告。
   */
  function gateDraft(
    draft: GameDocument,
    targetX: number,
    targetY: number,
  ): { allow: boolean; reason?: string } {
    if (pinned.value.length === 0) return { allow: true };
    const sync = syncLending(draft, pinned.value);
    const blocking = closedLendingDoorAt(draft, targetX, targetY);
    if (blocking && !sync.audit.ok) {
      const first = sync.audit.rejects[0]?.reason ?? "调借已失效";
      return {
        allow: false,
        reason: `门 ${blocking.id} 借不齐（${first}）；齿条收回与通行同时生效，这步过不去`,
      };
    }
    return { allow: true };
  }

  /** 实际移动后提交同步结果。 */
  function commitAfterMove(): LendingSync {
    const sync = syncLending(document.value, pinned.value);
    lastSync.value = sync;
    return sync;
  }

  return {
    selectedIds,
    pinned,
    inspectedId,
    inspectedDoor,
    inspectedWitness,
    analysis,
    hasLending,
    pinnedDoors,
    lastSync,
    toggleDoor,
    inspect,
    pinSelected,
    unpin,
    resetForLevel,
    gateDraft,
    commitAfterMove,
  };
}
