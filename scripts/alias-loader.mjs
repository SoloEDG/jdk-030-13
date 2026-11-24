/** 仅用于裸 Node 跑逻辑测试：解析 "@/..." 别名并为相对/别名导入补 .ts 后缀。 */
import { pathToFileURL } from "node:url";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = resolvePath(here, "..", "src");

function tryCandidates(base, context, nextResolve, specifier) {
  const candidates = [
    resolvePath(base, specifier),
    resolvePath(base, `${specifier}.ts`),
    resolvePath(base, specifier, "index.ts"),
  ];
  return candidates;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const candidates = [
      resolvePath(srcRoot, rel),
      resolvePath(srcRoot, `${rel}.ts`),
      resolvePath(srcRoot, rel, "index.ts"),
    ];
    for (const candidate of candidates) {
      try {
        return await nextResolve(pathToFileURL(candidate).href, context);
      } catch {
        // 试下一个候选
      }
    }
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const base = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : here;
    for (const candidate of tryCandidates(base, context, nextResolve, specifier)) {
      try {
        return await nextResolve(pathToFileURL(candidate).href, context);
      } catch {
        // 试下一个候选
      }
    }
  }
  return nextResolve(specifier, context);
}

/** 纯逻辑测试不渲染组件，把 .vue 当成空模块，避免 Node 无法解析 SFC。 */
export async function load(url, context, nextLoad) {
  if (url.endsWith(".vue")) {
    return { format: "module", source: "export default {};", shortCircuit: true };
  }
  return nextLoad(url, context);
}
