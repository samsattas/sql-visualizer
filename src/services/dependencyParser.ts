export interface CallSnippet {
  lines: string[];   // original source lines of the snippet
  startLine: number; // 1-based line number in the file where the EXEC appears
}

export interface SPDependency {
  name: string;           // normalized lowercase key
  displayName: string;    // original casing
  filePath: string;
  calls: string[];        // normalized names of SPs this one calls
  callSnippets: Record<string, CallSnippet[]>; // callee name → code snippets
  definedInProject: boolean;
}

export type DependencyMap = Map<string, SPDependency>;

function normalizeName(raw: string): string {
  return raw.replace(/\[|\]/g, '').split('.').pop()!.toLowerCase().trim();
}

function extractSPName(sql: string): string | null {
  const match = sql.match(/CREATE\s+(?:PROCEDURE|PROC)\s+([\w\.\[\]]+)/i);
  if (!match) return null;
  return match[1].replace(/\[|\]/g, '').split('.').pop() ?? null;
}

function stripNonExecutable(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/--.*/g, '')
    .replace(/^\s*GRANT\b.*/gim, '')      // GRANT EXECUTE ON ...
    .replace(/^\s*sp_procxmode\b.*/gim, '') // sp_procxmode utility calls
    .replace(/^\s*setuser\b.*/gim, '')
    .replace(/^\s*go\s*$/gim, '');
}

function extractExecCalls(sql: string): string[] {
  const clean = stripNonExecutable(sql);

  const found: string[] = [];
  const re = /\bEXEC(?:UTE)?\s+([\w\.\[\]]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const name = m[1].replace(/\[|\]/g, '').split('.').pop();
    if (name) found.push(name);
  }
  return [...new Set(found)];
}

const CONTEXT_BEFORE = 3;
const CONTEXT_AFTER = 5;

function extractCallSnippets(
  originalSql: string,
  calls: string[]
): Record<string, CallSnippet[]> {
  const originalLines = originalSql.split('\n');
  // Clean version (preserving line numbers) to find EXEC positions
  const cleanLines = stripNonExecutable(originalSql).split('\n');

  const result: Record<string, CallSnippet[]> = {};

  for (const callName of calls) {
    const snippets: CallSnippet[] = [];
    const pattern = new RegExp(`\\bEXEC(?:UTE)?\\s+[\\w\\.\\[\\]]*${callName}\\b`, 'i');

    for (let i = 0; i < cleanLines.length; i++) {
      if (!pattern.test(cleanLines[i])) continue;

      const from = Math.max(0, i - CONTEXT_BEFORE);
      const to = Math.min(originalLines.length - 1, i + CONTEXT_AFTER);
      const raw = originalLines.slice(from, to + 1);

      // Dedent: find minimum leading spaces across non-empty lines
      const minIndent = raw
        .filter(l => l.trim().length > 0)
        .reduce((min, l) => Math.min(min, l.match(/^(\s*)/)?.[1].length ?? 0), Infinity);
      const dedented = raw.map(l => l.slice(Math.min(minIndent, l.length)));

      snippets.push({ lines: dedented, startLine: i + 1 }); // 1-based
    }

    if (snippets.length > 0) result[normalizeName(callName)] = snippets;
  }

  return result;
}

export function parseSQLFiles(
  files: { name: string; content: string }[]
): DependencyMap {
  const map: DependencyMap = new Map();

  for (const file of files) {
    const spName = extractSPName(file.content);
    if (!spName) continue;

    const key = normalizeName(spName);
    const rawCalls = extractExecCalls(file.content);
    const calls = [...new Set(rawCalls.map(normalizeName).filter(c => c !== key))];
    const callSnippets = extractCallSnippets(file.content, rawCalls.filter(c => normalizeName(c) !== key));

    map.set(key, {
      name: key,
      displayName: spName,
      filePath: file.name,
      calls,
      callSnippets,
      definedInProject: true,
    });
  }

  // Add external SPs referenced but not defined in project
  for (const node of map.values()) {
    for (const call of node.calls) {
      if (!map.has(call)) {
        map.set(call, {
          name: call,
          displayName: call,
          filePath: '',
          calls: [],
          callSnippets: {},
          definedInProject: false,
        });
      }
    }
  }

  return map;
}

export interface LayoutNode {
  sp: SPDependency;
  x: number;
  y: number;
  level: number;
}

export interface LayoutResult {
  layout: Map<string, LayoutNode>;
  isolatedNodes: SPDependency[];
  totalWidth: number;
  totalHeight: number;
}

export function computeLayout(nodes: DependencyMap): LayoutResult {
  const CARD_W = 210;
  const CARD_H = 62;
  const COL_GAP = 200;
  const ROW_GAP = 22;

  // Build callers map
  const callers = new Map<string, Set<string>>();
  for (const [name, node] of nodes) {
    for (const call of node.calls) {
      if (!callers.has(call)) callers.set(call, new Set());
      callers.get(call)!.add(name);
    }
  }

  // Separate isolated nodes (defined, no outgoing calls, not called by anyone in project)
  const isolatedNodes: SPDependency[] = [];
  const activeNames = new Set<string>();

  for (const [name, node] of nodes) {
    if (!node.definedInProject) {
      activeNames.add(name); // external nodes always go in main graph
      continue;
    }
    const hasOutgoing = node.calls.length > 0;
    const hasIncoming = [...(callers.get(name) ?? [])].some(c => nodes.get(c)?.definedInProject);
    if (!hasOutgoing && !hasIncoming) {
      isolatedNodes.push(node);
    } else {
      activeNames.add(name);
    }
  }
  isolatedNodes.sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Roots among active nodes: defined SPs not called by any other defined active SP
  const roots = [...activeNames].filter(name => {
    if (!nodes.get(name)?.definedInProject) return false;
    const c = callers.get(name);
    if (!c) return true;
    for (const caller of c) {
      if (activeNames.has(caller) && nodes.get(caller)?.definedInProject) return false;
    }
    return true;
  });

  // BFS to assign levels (longest-path assignment)
  const levelMap = new Map<string, number>();
  const queue: { name: string; level: number }[] = roots.map(r => ({ name: r, level: 0 }));
  while (queue.length > 0) {
    const { name, level } = queue.shift()!;
    if ((levelMap.get(name) ?? -1) >= level) continue;
    levelMap.set(name, level);
    const node = nodes.get(name);
    if (node) {
      for (const call of node.calls) {
        if (activeNames.has(call)) queue.push({ name: call, level: level + 1 });
      }
    }
  }
  // Assign level 0 to any unvisited active nodes
  for (const name of activeNames) {
    if (!levelMap.has(name)) levelMap.set(name, 0);
  }

  // Group by level, initial sort: defined first, then alphabetical
  const byLevel = new Map<number, string[]>();
  for (const [name, level] of levelMap) {
    if (!byLevel.has(level)) byLevel.set(level, []);
    byLevel.get(level)!.push(name);
  }
  for (const names of byLevel.values()) {
    names.sort((a, b) => {
      const da = nodes.get(a)?.definedInProject ? 0 : 1;
      const db = nodes.get(b)?.definedInProject ? 0 : 1;
      return da !== db ? da - db : a.localeCompare(b);
    });
  }

  // Barycentric crossing-reduction: 4 passes (forward + backward)
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b);

  for (let pass = 0; pass < 4; pass++) {
    // Forward: order by avg position of predecessors (callers) at prev level
    for (const level of sortedLevels) {
      if (level === 0) continue;
      const prevNames = byLevel.get(level - 1)!;
      const prevPos = new Map<string, number>(prevNames.map((n, i) => [n, i]));
      byLevel.get(level)!.sort((a, b) => {
        const aCallers = [...(callers.get(a) ?? [])].filter(c => prevPos.has(c));
        const bCallers = [...(callers.get(b) ?? [])].filter(c => prevPos.has(c));
        const avg = (arr: string[]) =>
          arr.length ? arr.reduce((s, c) => s + prevPos.get(c)!, 0) / arr.length : 1e9;
        return avg(aCallers) - avg(bCallers);
      });
    }
    // Backward: order by avg position of successors (callees) at next level
    for (const level of [...sortedLevels].reverse()) {
      const nextNames = byLevel.get(level + 1);
      if (!nextNames) continue;
      const nextPos = new Map<string, number>(nextNames.map((n, i) => [n, i]));
      byLevel.get(level)!.sort((a, b) => {
        const aCalls = (nodes.get(a)?.calls ?? []).filter(c => nextPos.has(c));
        const bCalls = (nodes.get(b)?.calls ?? []).filter(c => nextPos.has(c));
        const avg = (arr: string[]) =>
          arr.length ? arr.reduce((s, c) => s + nextPos.get(c)!, 0) / arr.length : 1e9;
        return avg(aCalls) - avg(bCalls);
      });
    }
  }

  const maxLevel = Math.max(...levelMap.values(), 0);
  const maxPerLevel = Math.max(...[...byLevel.values()].map(v => v.length), 1);
  const totalHeight = maxPerLevel * (CARD_H + ROW_GAP);

  // Position nodes — vertically center each column
  const layout = new Map<string, LayoutNode>();
  for (const [level, names] of byLevel) {
    const colHeight = names.length * (CARD_H + ROW_GAP);
    const yOffset = (totalHeight - colHeight) / 2;
    names.forEach((name, idx) => {
      layout.set(name, {
        sp: nodes.get(name)!,
        x: level * (CARD_W + COL_GAP),
        y: yOffset + idx * (CARD_H + ROW_GAP),
        level,
      });
    });
  }

  return {
    layout,
    isolatedNodes,
    totalWidth: (maxLevel + 1) * (CARD_W + COL_GAP),
    totalHeight,
  };
}

export const CARD_W = 210;
export const CARD_H = 62;
