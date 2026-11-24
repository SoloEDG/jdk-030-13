export { useLending } from "./model/useLending";
export {
  analyzePlan,
  doorWitness,
  findConflict,
  type ConflictReport,
  type DoorReport,
  type PlanAnalysis,
  type WitnessLine,
} from "./lib/analysis";
export {
  auditLoans,
  loansFor,
  planDoors,
  planSingle,
  type DoorPlan,
} from "./lib/match";
export {
  braceOption,
  doorOptions,
  OPPOSITE,
  SIDE_LABEL,
  type BraceOption,
} from "./lib/geometry";
export { closedLendingDoorAt, isLendingDoor, syncLending } from "./lib/runtime";
export { default as PlanBoard } from "./ui/PlanBoard.vue";
