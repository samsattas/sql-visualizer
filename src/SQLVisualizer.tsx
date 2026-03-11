/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Play, 
  Database, 
  Workflow
} from 'lucide-react';
import { Badge } from './components/Badge';
import { FlowNode } from './components/FlowNode';
import { Sidebar } from './components/Sidebar';
import { CodeView } from './components/CodeView';
import { SummaryFooter } from './components/SummaryFooter';
import { parseSQL } from './services/sqlParser';
import { ParsedSQL, SQLNode } from './types';

export default function SQLVisualizer() {
  const [sql, setSql] = useState<string>(`CREATE PROCEDURE dbo.UpdateOrderStatus
  @OrderID INT,
  @NewStatus VARCHAR(50),
  @UpdatedBy VARCHAR(100),
  @AffectedRows INT OUTPUT
AS
BEGIN
  BEGIN TRY
    BEGIN TRAN
      UPDATE Sales.Orders
      SET Status = @NewStatus,
          UpdatedDate = GETDATE(),
          UpdatedBy = @UpdatedBy
      WHERE OrderID = @OrderID

      SELECT @AffectedRows = @@ROWCOUNT

      IF @AffectedRows = 0
        RAISERROR('Order not found', 16, 1)
    COMMIT TRAN
  END TRY
  BEGIN CATCH
    ROLLBACK TRAN
    INSERT INTO Logs.ErrorLog (Message, OccurredAt)
    VALUES (ERROR_MESSAGE(), GETDATE())
  END CATCH
END`);

  const [parsed, setParsed] = useState<ParsedSQL | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SQLNode | null>(null);
  const codeLinesRef = useRef<(HTMLDivElement | null)[]>([]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setSelectedNode(null);
    setTimeout(() => {
      try {
        const result = parseSQL(sql);
        setParsed(result);
      } catch (e) {
        console.error(e);
      } finally {
        setIsAnalyzing(false);
      }
    }, 800);
  };

  const handleNodeClick = (node: SQLNode) => {
    setSelectedNode(node);
    // Scroll to the first line of the node
    if (codeLinesRef.current[node.startLine]) {
      codeLinesRef.current[node.startLine]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Initial analysis
  useEffect(() => {
    handleAnalyze();
  }, []);

  const sqlLines = useMemo(() => sql.split('\n'), [sql]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Input Section */}
      <div className="flex-none border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl z-50">
        <div className="max-w-[1600px] mx-auto p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Database className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tighter">SQL VISUALIZER</h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">Advanced Script Analyzer</p>
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black text-sm rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
              {isAnalyzing ? 'ANALYZING...' : 'ANALYZE SCRIPT'}
            </button>
          </div>
          
          <div className="relative group">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="Paste your SQL script here..."
              className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-sm text-zinc-400 focus:outline-none focus:border-blue-500/50 transition-colors resize-none shadow-inner"
            />
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800">SQL MODE</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {parsed && (
          <div className="h-full max-w-[1600px] mx-auto p-6 flex flex-col">
            {/* Header */}
            <div className="flex-none mb-8 relative">
              <div className="absolute -left-6 top-0 bottom-0 w-1 bg-blue-600 rounded-full" />
              <div className="flex items-baseline gap-3">
                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{parsed.name}</h2>
                <span className="text-zinc-500 font-mono text-lg">[{parsed.type}]</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">{parsed.databaseContext || 'Default Context'}</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-zinc-700" />
                <div className="text-xs text-zinc-500 font-medium">Analyzed on {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_400px] gap-8 min-h-0 pb-20">
              
              {/* Left Panel: Parameters & Variables */}
              <Sidebar parsed={parsed} />

              {/* Center: Flow Diagram */}
              <div className="h-full overflow-y-auto custom-scrollbar pr-2 bg-zinc-950/50 rounded-3xl border border-zinc-800/50 p-8 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
                
                <div className="relative z-10">
                  {parsed.nodes.length > 0 ? (
                    parsed.nodes.map((node, i) => (
                      <FlowNode 
                        key={node.id} 
                        node={node} 
                        index={i} 
                        total={parsed.nodes.length} 
                        onNodeClick={handleNodeClick}
                        selectedNodeId={selectedNode?.id}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] text-zinc-600">
                      <Workflow className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">No execution nodes detected.</p>
                      <p className="text-xs opacity-50">Try adding SELECT, INSERT, UPDATE, or DELETE statements.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Code View */}
              <CodeView 
                sqlLines={sqlLines} 
                selectedNode={selectedNode} 
                codeLinesRef={codeLinesRef} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Summary Footer */}
      {parsed && <SummaryFooter parsed={parsed} />}
    </div>
  );
}
