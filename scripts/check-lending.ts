/**
 * 独立逻辑校验（node --experimental-strip-types 运行）。
 * 不经过 Vite，故用相对路径直连 src 下的纯函数模块。
 */
import { hydrate, LEVELS } from "../src/features/voyage/lib/catalog.ts";
import { analyzePlan } from "../src/features/lending/lib/analysis.ts";
import { auditLoans, loansFor, planDoors } from "../src/features/lending/lib/match.ts";
import { syncLending } from "../src/features/lending/lib/runtime.ts";
import { evaluateGadgets } from "../src/features/gadget/lib/power.ts";
import type { GameDocument, Loan } from "../src/shared/types.ts";

let failures = 0;
function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

function load(id: string): GameDocument {
  const bp = LEVELS.find((level) => level.id === id)!;
  return {
    version: 1,
    currentLevelId: id,
    level: hydrate(bp),
    attempt: { steps: 0, status: "playing" },
    records: {},
  };
}

console.log("lend-01 借齿条");
{
  const doc = load("lend-01");
  const analysis = analyzePlan(doc, ["d1"]);
  check("单门可开", analysis.jointFeasible);
  const built = loansFor(doc, ["d1"]);
  check("能生成一笔调借", built.ok && built.loans.length === 1);
  const sync = syncLending(doc, built.loans);
  check("钉住后门同步打开", sync.audit.ok && doc.level.doors[0].open);
  // 货箱 (1,5) 向南推一格到 (1,6)：与门 (5,5) 既不同行也不同列，齿条脱钩
  const box = doc.level.boxes[0];
  box.y = 6;
  const after = syncLending(doc, built.loans);
  check("搬离直线后整组收回且门关闭", !after.audit.ok && !doc.level.doors[0].open);
  check("拒收给出原因", after.audit.rejects.length > 0);
}

console.log("lend-02 互抢");
{
  const doc = load("lend-02");
  const alone1 = analyzePlan(doc, ["main"]);
  const alone2 = analyzePlan(doc, ["side"]);
  check("main 单独可开", alone1.jointFeasible);
  check("side 单独可开", alone2.jointFeasible);
  const both = analyzePlan(doc, ["main", "side"]);
  check("初始位置两扇不能同开", !both.jointFeasible);
  check("冲突集极小且两扇都在其中",
    both.conflict != null &&
    both.conflict.minimal.length === 2 &&
    both.conflict.removable.length === 2,
    JSON.stringify(both.conflict));
  // 短齿条货箱 (3,1) 向西推一格到 (2,1)：距 side 门 (1,1) 恰好 1 格，
  // 短齿条独自撑住 side，长齿条得以腾出专门撑 main，两扇同开。
  doc.level.boxes[1].x = 2;
  const moved = analyzePlan(doc, ["main", "side"]);
  check("短齿条换位后两扇可同开", moved.jointFeasible);
  const built = loansFor(doc, ["main", "side"]);
  check("同开方案各用一根齿条",
    built.ok && new Set(built.loans.map((loan) => loan.rackId)).size === 2);
}

console.log("lend-03 长门对撑");
{
  const doc = load("lend-03");
  const long = analyzePlan(doc, ["long"]);
  check("长门初始可由两侧对撑", long.jointFeasible);
  const side = analyzePlan(doc, ["side"]);
  check("旁门初始可开", side.jointFeasible);
  const both = analyzePlan(doc, ["long", "side"]);
  check("长门与旁门初始互抢", !both.jointFeasible);
  check("冲突集含两扇门",
    both.conflict != null && both.conflict.minimal.length === 2,
    JSON.stringify(both.conflict));
  // 短齿条货箱 (3,3) 向西推一格到 (2,3)：距旁门 (1,3) 恰好 1 格，
  // 短齿条独自撑旁门，两根长齿条得以从两侧对撑长门，两扇同开。
  doc.level.boxes[2].x = 2;
  const moved = analyzePlan(doc, ["long", "side"]);
  check("短齿条换位后长门旁门可同开", moved.jointFeasible);
  const built = loansFor(doc, ["long", "side"]);
  check("共三笔调借且齿条不重复",
    built.ok && built.loans.length === 3 &&
    new Set(built.loans.map((loan) => loan.rackId)).size === 3);
  const longLoans = built.loans.filter((loan) => loan.doorId === "long");
  check("长门拿到相反方向的两根",
    longLoans.length === 2 &&
    new Set(longLoans.map((loan) => loan.side)).size === 2);
  // 原子性：抽掉其中一根齿条，整笔审计必须失败
  const broken: Loan[] = built.loans.slice(1);
  const audit = auditLoans(doc.level, broken);
  check("少一根门眼即整笔拒收", !audit.ok && audit.rejects.length > 0);
}

console.log("匹配增广路对抗用例");
{
  // 干净构造：两个货箱各带一根 reach=2 的齿条，三扇单眼门排在同一行。
  // 箱 a 在 x=4、箱 b 在 x=8；门 A=2、B=6、C=10（均在 y=5）。
  // ra 可到 A(距2)、B(距2)；rb 可到 B(距2)、C(距2)。
  const doc = load("lend-01");
  const level = doc.level;
  level.doors = [
    { id: "A", x: 2, y: 5, open: false, color: "timber", sockets: 1 },
    { id: "B", x: 6, y: 5, open: false, color: "timber", sockets: 1 },
    { id: "C", x: 10, y: 5, open: false, color: "timber", sockets: 1 },
  ];
  level.boxes = [
    { id: "box-a", kind: "timber", x: 4, y: 5 },
    { id: "box-b", kind: "timber", x: 8, y: 5 },
  ];
  level.racks = [
    { id: "ra", boxId: "box-a", color: "timber", reach: 2 },
    { id: "rb", boxId: "box-b", color: "timber", reach: 2 },
  ];
  check("A、C 分用两根齿条可同开", planDoors(level, ["A", "C"]).feasible);
  check("A、B 需要增广轮换且可同开", planDoors(level, ["A", "B"]).feasible);
  check("B、C 可同开", planDoors(level, ["B", "C"]).feasible);
  check("三扇门争两根齿条必有一扇借不到", !planDoors(level, ["A", "B", "C"]).feasible);
  const conflict = analyzePlan(doc, ["A", "B", "C"]);
  check("冲突分析给出极小集且任删一扇即成立",
    conflict.conflict != null &&
    conflict.conflict.minimal.length === 3 &&
    conflict.conflict.removable.length === 3,
    JSON.stringify(conflict.conflict));
}

console.log("旧关卡不受齿条影响");
{
  const doc = load("latch-01");
  check("旧关没有齿条", doc.level.racks.length === 0);
  check("空选择视为可行", planDoors(doc.level, []).feasible);
  const sync = syncLending(doc, []);
  check("空调借同步无拒收", sync.audit.ok);
  // 踏板门仍由 evaluateGadgets 驱动：把木箱推上唯一踏板 (3,4)
  check("旧门初始关闭", doc.level.doors.every((door) => !door.open));
  const plate = doc.level.plates[0];
  const box = doc.level.boxes.find((item) => item.kind === plate.accept)!;
  box.x = plate.x;
  box.y = plate.y;
  evaluateGadgets(doc);
  check("压踏板后旧门照常打开", doc.level.doors.some((door) => door.open));
  // 色门逻辑不会误伤无 color 的旧门
  const again = syncLending(doc, []);
  check("色门同步不关闭踏板门", again.audit.ok && doc.level.doors.some((door) => door.open));
}

console.log(failures === 0 ? "\n全部通过" : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
