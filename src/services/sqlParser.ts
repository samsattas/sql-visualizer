import { 
  ParsedSQL, 
  SQLNode, 
  SQLParameter, 
  SQLVariable, 
  TableSummary, 
  NodeType 
} from '../types';

export const STATEMENT_STARTERS = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'SET', 'DECLARE', 'IF', 'WHILE', 
  'BEGIN', 'END', 'RETURN', 'RAISERROR', 'PRINT', 'EXEC', 'OPEN', 'CLOSE', 
  'FETCH', 'DEALLOCATE', 'COMMIT', 'ROLLBACK', 'THROW', 'MERGE', 'TRUNCATE', 'DROP', 'CREATE', 'ALTER'
];

export function parseSQL(sql: string): ParsedSQL {
  const cleanSql = sql.replace(/\/\*[\s\S]*?\*\/|--.*/g, ''); // Remove comments
  const lines = cleanSql.split('\n');
  
  // 1. Header Info
  let name = "Untitled Script";
  let type: ParsedSQL['type'] = 'Script';
  const procMatch = cleanSql.match(/CREATE\s+(PROCEDURE|PROC|FUNCTION|TRIGGER)\s+([\[\]\w\.]+)/i);
  if (procMatch) {
    type = procMatch[1].toUpperCase().startsWith('PROC') ? 'Procedure' : 
           procMatch[1].toUpperCase() === 'FUNCTION' ? 'Function' : 'Trigger';
    name = procMatch[2].replace(/[\[\]]/g, '');
  }

  const dbContextMatch = cleanSql.match(/USE\s+([\[\]\w\.]+)/i);
  const databaseContext = dbContextMatch ? dbContextMatch[1].replace(/[\[\]]/g, '') : undefined;

  // 2. Parameters
  const parameters: SQLParameter[] = [];
  const headerPart = cleanSql.split(/\bAS\b|\bBEGIN\b/i)[0];
  const paramRegex = /(@[\w]+)\s+([\w\(\)]+)(?:\s*=\s*([^,\s\)]+))?(?:\s+(OUTPUT|OUT))?/gi;
  let m;
  while ((m = paramRegex.exec(headerPart)) !== null) {
    parameters.push({
      name: m[1],
      type: m[2],
      category: m[4] ? 'OUTPUT' : (m[3] ? 'OPTIONAL' : 'INPUT'),
      defaultValue: m[3]
    });
  }

  // 3. Variables
  const variables: SQLVariable[] = [];

  // 4. Tables Map (for summary)
  const tablesMap = new Map<string, TableSummary>();
  const addTableOp = (tableName: string, op: 'READ' | 'WRITE' | 'DELETE', cols: string[] = []) => {
    if (!tableName) return;
    const parts = tableName.split('.');
    const db = parts.length > 2 ? parts[0] : (databaseContext || 'Default');
    const table = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const key = `${db}.${table}`;
    if (!tablesMap.has(key)) {
      tablesMap.set(key, { name: table, database: db, operations: new Set(), columns: new Set() });
    }
    const summary = tablesMap.get(key)!;
    summary.operations.add(op);
    cols.forEach(c => summary.columns.add(c));
  };

  let nodeIdCounter = 0;
  const getNextId = () => `node-${nodeIdCounter++}`;

  function extractVariablesFromDeclare(statement: string): SQLVariable[] {
    const vars: SQLVariable[] = [];
    const content = statement.replace(/^DECLARE\s+/i, '').trim();
    
    const segments: string[] = [];
    let currentSegment = '';
    let parenDepth = 0;
    for (let k = 0; k < content.length; k++) {
      const char = content[k];
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === ',' && parenDepth === 0) {
        segments.push(currentSegment.trim());
        currentSegment = '';
      } else {
        currentSegment += char;
      }
    }
    if (currentSegment.trim()) segments.push(currentSegment.trim());

    segments.forEach(seg => {
      const match = seg.match(/(@[\w]+)\s+([\s\S]+)/i);
      if (match) {
        const name = match[1];
        let rest = match[2].trim();
        let typePart = rest;
        let initialValue: string | undefined;
        
        const eqIndex = rest.indexOf('=');
        if (eqIndex !== -1) {
          typePart = rest.substring(0, eqIndex).trim();
          initialValue = rest.substring(eqIndex + 1).trim();
        }
        
        const isTable = typePart.toUpperCase().startsWith('TABLE');
        vars.push({
          name,
          type: isTable ? 'TABLE' : typePart,
          category: isTable ? 'TABLE' : 'INTERNAL',
          initialValue
        });
      }
    });
    return vars;
  }

  function parseSingleStatement(text: string, startLine: number, endLine: number): SQLNode {
    const trimmed = text.trim();
    const upper = trimmed.toUpperCase();
    const firstLine = trimmed.split('\n')[0].trim();
    const node: SQLNode = { 
      id: getNextId(), 
      type: 'SET', 
      title: firstLine, 
      children: [],
      startLine,
      endLine
    };

    if (upper.startsWith('SELECT')) {
      node.type = 'SELECT';
      const fromMatch = trimmed.match(/FROM\s+([\[\]\w\.]+)/i);
      if (fromMatch) {
        node.table = fromMatch[1].replace(/[\[\]]/g, '');
        addTableOp(node.table, 'READ');
      }
    } else if (upper.startsWith('UPDATE')) {
      node.type = 'UPDATE';
      const tableMatch = trimmed.match(/UPDATE\s+([\[\]\w\.]+)/i);
      if (tableMatch) {
        node.table = tableMatch[1].replace(/[\[\]]/g, '');
        addTableOp(node.table, 'WRITE');
      }
    } else if (upper.startsWith('INSERT')) {
      node.type = 'INSERT';
      const intoMatch = trimmed.match(/INSERT\s+(?:INTO\s+)?([\[\]\w\.]+)/i);
      if (intoMatch) {
        node.table = intoMatch[1].replace(/[\[\]]/g, '');
        addTableOp(node.table, 'WRITE');
      }
    } else if (upper.startsWith('DELETE')) {
      node.type = 'DELETE';
      const fromMatch = trimmed.match(/DELETE\s+(?:FROM\s+)?([\[\]\w\.]+)/i);
      if (fromMatch) {
        node.table = fromMatch[1].replace(/[\[\]]/g, '');
        addTableOp(node.table, 'DELETE');
      }
    } else if (upper.startsWith('EXEC')) {
      node.type = 'EXEC';
    } else if (upper.startsWith('RAISERROR') || upper.startsWith('THROW')) {
      node.type = upper.startsWith('RAISERROR') ? 'RAISERROR' : 'THROW';
    } else if (upper.startsWith('RETURN')) {
      node.type = 'RETURN';
    } else if (upper.startsWith('SET')) {
      node.type = 'SET';
    } else if (upper.startsWith('DECLARE')) {
      node.type = 'DECLARE';
      node.variables = extractVariablesFromDeclare(trimmed);
    } else if (upper.startsWith('PRINT')) {
      node.type = 'PRINT';
    }

    return node;
  }

  function findMatchingEnd(lines: string[], beginIndex: number): number {
    let depth = 1;
    let i = beginIndex + 1;
    while (i < lines.length) {
      const token = lines[i].trim().toUpperCase();
      if (token === 'BEGIN' || token.endsWith(' BEGIN') || token.startsWith('BEGIN ')) depth++;
      if (token === 'END' || token.startsWith('END ') || token === 'END;') depth--;
      if (depth === 0) return i;
      i++;
    }
    return lines.length - 1;
  }

  function parseBlock(lines: string[], startIndex: number, endIndex: number): SQLNode[] {
    const nodes: SQLNode[] = [];
    let i = startIndex;

    function isStatementStarter(line: string): boolean {
      const trimmed = line.trim().toUpperCase();
      if (!trimmed) return false;
      return STATEMENT_STARTERS.some(s => trimmed === s || trimmed.startsWith(s + ' '));
    }

    function consumeStatement(lines: string[], startIndex: number, endIndex: number): { text: string, startLine: number, endLine: number } {
      let currentIdx = startIndex;
      let statementText = lines[currentIdx];
      let j = currentIdx + 1;
      
      while (j <= endIndex) {
        const nextLine = lines[j].trim();
        if (!nextLine) { j++; continue; }
        
        const upperNext = nextLine.toUpperCase();
        if (statementText.trim().endsWith(';')) break;
        
        const isStarter = isStatementStarter(nextLine);
        const currentType = statementText.trim().split(/\s+/)[0].toUpperCase();
        
        if (isStarter) {
          // Special case for UPDATE ... SET and INSERT ... SELECT
          if (currentType === 'UPDATE' && upperNext.startsWith('SET')) {
            // continue
          } else if (currentType === 'INSERT' && upperNext.startsWith('SELECT')) {
            // continue
          } else {
            break;
          }
        }
        
        if (upperNext === 'BEGIN' || upperNext === 'END' || upperNext === 'END;') break;

        statementText += '\n' + lines[j];
        j++;
      }
      return { text: statementText, startLine: startIndex, endLine: j - 1 };
    }

    while (i <= endIndex) {
      const line = lines[i].trim();
      const upperLine = line.toUpperCase();

      if (!line) {
        i++;
        continue;
      }

      if (upperLine.startsWith('IF ')) {
        const ifNode: SQLNode = { 
          id: getNextId(), 
          type: 'IF', 
          title: 'IF', 
          condition: line.substring(3).trim().split(/\bBEGIN\b/i)[0].trim(),
          children: [],
          trueBranch: [],
          elseBranch: [],
          startLine: i,
          endLine: i
        };
        i++;

        // Skip empty lines
        while (i <= endIndex && !lines[i].trim()) i++;

        if (i <= endIndex && lines[i].trim().toUpperCase() === 'BEGIN') {
          const bodyStart = i + 1;
          const bodyEnd = findMatchingEnd(lines, i);
          ifNode.trueBranch = parseBlock(lines, bodyStart, bodyEnd - 1);
          i = bodyEnd + 1;
        } else if (i <= endIndex) {
          const stmt = consumeStatement(lines, i, endIndex);
          ifNode.trueBranch = [parseSingleStatement(stmt.text, stmt.startLine, stmt.endLine)];
          i = stmt.endLine + 1;
        }

        // Check for ELSE
        while (i <= endIndex && !lines[i].trim()) i++;
        if (i <= endIndex && lines[i].trim().toUpperCase().startsWith('ELSE')) {
          i++;
          
          // Skip empty lines
          while (i <= endIndex && !lines[i].trim()) i++;

          if (i <= endIndex && lines[i].trim().toUpperCase().startsWith('IF ')) {
            const nestedIf = parseBlock(lines, i, endIndex);
            if (nestedIf.length > 0) {
              ifNode.elseBranch = [nestedIf[0]];
              i = nestedIf[0].endLine + 1;
            }
          } else if (i <= endIndex && lines[i].trim().toUpperCase() === 'BEGIN') {
            const bodyStart = i + 1;
            const bodyEnd = findMatchingEnd(lines, i);
            ifNode.elseBranch = parseBlock(lines, bodyStart, bodyEnd - 1);
            i = bodyEnd + 1;
          } else if (i <= endIndex) {
            const stmt = consumeStatement(lines, i, endIndex);
            ifNode.elseBranch = [parseSingleStatement(stmt.text, stmt.startLine, stmt.endLine)];
            i = stmt.endLine + 1;
          }
        }
        ifNode.endLine = i - 1;
        nodes.push(ifNode);
      } else if (upperLine.startsWith('BEGIN TRY')) {
        const tryStart = i;
        const tryEnd = findMatchingEnd(lines, i);
        const tryNodes = parseBlock(lines, i + 1, tryEnd - 1);
        i = tryEnd + 1;

        // Check for CATCH
        while (i <= endIndex && !lines[i].trim()) i++;
        if (i <= endIndex && lines[i].trim().toUpperCase().startsWith('BEGIN CATCH')) {
          const catchEnd = findMatchingEnd(lines, i);
          const catchNodes = parseBlock(lines, i + 1, catchEnd - 1);
          nodes.push({
            id: getNextId(),
            type: 'TRY_CATCH' as NodeType,
            title: 'TRY / CATCH',
            children: [],
            trueBranch: tryNodes,
            elseBranch: catchNodes,
            startLine: tryStart,
            endLine: catchEnd
          });
          i = catchEnd + 1;
        } else {
          nodes.push({ 
            id: getNextId(), 
            type: 'TRY', 
            title: 'TRY', 
            children: tryNodes,
            startLine: tryStart,
            endLine: tryEnd
          });
        }
      } else if (upperLine.startsWith('BEGIN TRAN')) {
        const startLine = i;
        const bodyEnd = findMatchingEnd(lines, i);
        nodes.push({ 
          id: getNextId(), 
          type: 'TRANSACTION', 
          title: 'Transaction', 
          children: parseBlock(lines, i + 1, bodyEnd - 1),
          startLine: startLine,
          endLine: bodyEnd
        });
        i = bodyEnd + 1;
      } else if (upperLine === 'BEGIN') {
        const startLine = i;
        const bodyEnd = findMatchingEnd(lines, i);
        nodes.push({ 
          id: getNextId(), 
          type: 'BLOCK', 
          title: 'Anonymous Block', 
          children: parseBlock(lines, i + 1, bodyEnd - 1),
          startLine: startLine,
          endLine: bodyEnd
        });
        i = bodyEnd + 1;
      } else if (upperLine === 'WHILE' || upperLine.startsWith('WHILE ')) {
        const startLine = i;
        const condition = line.substring(5).trim().split(/\bBEGIN\b/i)[0].trim();
        i++;
        while (i <= endIndex && !lines[i].trim()) i++;
        
        const whileNode: SQLNode = { 
          id: getNextId(), 
          type: 'WHILE', 
          title: 'WHILE', 
          condition, 
          children: [],
          startLine: startLine,
          endLine: startLine
        };
        if (i <= endIndex && lines[i].trim().toUpperCase() === 'BEGIN') {
          const bodyEnd = findMatchingEnd(lines, i);
          whileNode.children = parseBlock(lines, i + 1, bodyEnd - 1);
          whileNode.endLine = bodyEnd;
          i = bodyEnd + 1;
        } else if (i <= endIndex) {
          const stmt = consumeStatement(lines, i, endIndex);
          whileNode.children = [parseSingleStatement(stmt.text, stmt.startLine, stmt.endLine)];
          whileNode.endLine = stmt.endLine;
          i = stmt.endLine + 1;
        }
        nodes.push(whileNode);
      } else {
        const stmt = consumeStatement(lines, i, endIndex);
        const node = parseSingleStatement(stmt.text, stmt.startLine, stmt.endLine);
        nodes.push(node);
        
        if (node.type === 'DECLARE' && node.variables) {
          node.variables.forEach(v => {
            if (!variables.find(existing => existing.name === v.name)) {
              variables.push(v);
            }
          });
        }
        i = stmt.endLine + 1;
      }
    }
    return nodes;
  }

  const rootNodes = parseBlock(lines, 0, lines.length - 1);

  // Flatten nodes for summary counts
  const allNodes: SQLNode[] = [];
  const flatten = (n: SQLNode) => {
    if (n.type !== 'ROOT') allNodes.push(n);
    n.children.forEach(flatten);
    n.trueBranch?.forEach(flatten);
    n.elseBranch?.forEach(flatten);
  };
  rootNodes.forEach(flatten);

  return {
    name,
    type,
    databaseContext,
    parameters,
    variables,
    nodes: rootNodes,
    tables: Array.from(tablesMap.values()),
    summary: {
      selects: allNodes.filter(n => n.type === 'SELECT').length,
      inserts: allNodes.filter(n => n.type === 'INSERT').length,
      updates: allNodes.filter(n => n.type === 'UPDATE').length,
      deletes: allNodes.filter(n => n.type === 'DELETE').length,
      tablesCount: tablesMap.size,
      databasesCount: new Set(Array.from(tablesMap.values()).map(t => t.database)).size,
      hasErrorHandling: allNodes.some(n => n.type === 'TRY' || n.type === 'TRY_CATCH' as NodeType),
      hasTransaction: allNodes.some(n => n.type === 'TRANSACTION')
    }
  };
}
