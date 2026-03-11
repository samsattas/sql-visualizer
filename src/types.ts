export type NodeType = 
  | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' 
  | 'IF' | 'ELSE' | 'WHILE' | 'CURSOR' 
  | 'TRY' | 'CATCH' | 'TRY_CATCH' | 'EXEC' | 'SET' | 'DECLARE'
  | 'TRANSACTION' | 'ERROR' | 'BLOCK' | 'ROOT' | 'RETURN'
  | 'RAISERROR' | 'THROW' | 'PRINT';

export interface SQLNode {
  id: string;
  type: NodeType;
  title: string;
  database?: string;
  table?: string;
  columns?: string[];
  condition?: string;
  content?: string;
  children: SQLNode[];
  trueBranch?: SQLNode[];
  elseBranch?: SQLNode[];
  variables?: SQLVariable[];
  startLine: number;
  endLine: number;
}

export interface SQLParameter {
  name: string;
  type: string;
  category: 'INPUT' | 'OUTPUT' | 'OPTIONAL';
  defaultValue?: string;
}

export interface SQLVariable {
  name: string;
  type: string;
  category: 'INTERNAL' | 'CURSOR' | 'TABLE';
  initialValue?: string;
}

export interface TableSummary {
  name: string;
  database: string;
  operations: Set<'READ' | 'WRITE' | 'DELETE'>;
  columns: Set<string>;
}

export interface ParsedSQL {
  name: string;
  type: 'Procedure' | 'Function' | 'Trigger' | 'Script';
  databaseContext?: string;
  parameters: SQLParameter[];
  variables: SQLVariable[];
  nodes: SQLNode[];
  tables: TableSummary[];
  summary: {
    selects: number;
    inserts: number;
    updates: number;
    deletes: number;
    execs: number;
    tablesCount: number;
    databasesCount: number;
    hasErrorHandling: boolean;
    hasTransaction: boolean;
  };
}
