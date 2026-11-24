<script setup lang="ts">
import { BOX_LABEL } from "@/shared/types";
import type { PlanAnalysis, WitnessLine } from "../lib/analysis";
import type { GameDocument, Loan } from "@/shared/types";

const props = defineProps<{
  document: GameDocument;
  analysis: PlanAnalysis;
  pinned: Loan[];
  inspectedId: string | null;
  inspectedWitness: WitnessLine[];
  pinnedDoors: string[];
}>();

const emit = defineEmits<{
  toggle: [doorId: string];
  inspect: [doorId: string];
  pin: [];
  unpin: [];
}>();

function doorTitle(id: string): string {
  return props.document.level.doors.find((door) => door.id === id)?.id ?? id;
}
</script>

<template>
  <section class="panel lending" aria-label="齿条借调规划盘">
    <h2>借调规划盘</h2>
    <p class="lede">勾选想同开的色门，先看哪些门各自能开、哪些真能同开，再钉住这组一起过。</p>

    <ul class="door-plan">
      <li v-for="report in analysis.doors" :key="report.door.id" :class="{
        conflict: analysis.conflict?.minimal.some((door) => door.id === report.door.id),
        selected: report.selected,
      }">
        <label class="pick">
          <input
            type="checkbox"
            :checked="report.selected"
            @change="emit('toggle', report.door.id)"
          />
          <button type="button" class="door-link" @click="emit('inspect', report.door.id)">
            门 {{ doorTitle(report.door.id) }}
          </button>
        </label>
        <span class="meta">
          {{ BOX_LABEL[report.door.color!] }} ·
          {{ (report.door.sockets ?? 1) === 2 ? "长门双门眼" : "单门眼" }}
          <b :class="report.alone.feasible ? 'live' : 'dead'">
            {{ report.alone.feasible ? "可单开" : "借不齐" }}
          </b>
        </span>
        <ul v-if="inspectedId === report.door.id" class="witness">
          <li v-if="!report.alone.feasible" class="dead">没有任何齿条能满足它的门眼。</li>
          <li v-for="(line, index) in inspectedWitness" :key="index">
            {{ line.text }}
          </li>
        </ul>
      </li>
    </ul>

    <div class="joint" :data-ok="analysis.jointFeasible">
      <template v-if="analysis.selectedIds.length === 0">
        尚未勾选门。
      </template>
      <template v-else-if="analysis.jointFeasible">
        这 {{ analysis.selectedIds.length }} 扇门可以同时撑住，齿条互不冲突。
      </template>
      <template v-else-if="analysis.conflict">
        <p class="conflict-title">
          冲突门集（再少任一扇就成立）：
          <b>{{ analysis.conflict.minimal.map((door) => door.id).join("、") }}</b>
        </p>
        <p class="conflict-hint">
          去掉其中任一扇即可同开，可先移除：
          {{ analysis.conflict.removable.map((door) => door.id).join("、") }}
        </p>
      </template>
    </div>

    <div class="actions">
      <button
        type="button"
        class="pin"
        :disabled="!analysis.jointFeasible || analysis.selectedIds.length === 0"
        @click="emit('pin')"
      >
        钉住这组一起过
      </button>
      <button type="button" class="unpin" :disabled="pinned.length === 0" @click="emit('unpin')">
        收回全部调借
      </button>
    </div>

    <div v-if="pinned.length" class="pinned">
      <h3>已钉住的调借</h3>
      <ul>
        <li v-for="(loan, index) in pinned" :key="index">
          {{ loan.rackId }} → 门 {{ loan.doorId }}（{{ loan.side }} 向）
        </li>
      </ul>
      <p class="hint">覆盖的门：{{ pinnedDoors.join("、") }}；搬箱后整组原子重算，借不齐即同时收回。</p>
    </div>
  </section>
</template>
