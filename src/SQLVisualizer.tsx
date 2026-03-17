/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Database,
  Workflow,
  ChevronUp,
  ChevronDown,
  GitBranch,
  Languages,
} from 'lucide-react';
import { Badge } from './components/Badge';
import { FlowNode } from './components/FlowNode';
import { Sidebar } from './components/Sidebar';
import { CodeView } from './components/CodeView';
import { SummaryFooter } from './components/SummaryFooter';
import { DependencyGraph } from './components/DependencyGraph';
import { parseSQL } from './services/sqlParser';
import { ParsedSQL, SQLNode } from './types';
import { useLang, type Lang } from './i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';

type ActiveTab = 'analyzer' | 'dependencies';

export default function SQLVisualizer() {
  const { lang, setLang, t } = useLang();
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
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

  // Panel visibility state
  const [inputOpen, setInputOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [codeOpen, setCodeOpen] = useState(true);

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
    if (codeLinesRef.current[node.startLine]) {
      codeLinesRef.current[node.startLine]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  useEffect(() => {
    handleAnalyze();
  }, []);

  const sqlLines = useMemo(() => sql.split('\n'), [sql]);

  const sidebarWidth = sidebarOpen ? '280px' : '44px';
  const codeWidth = codeOpen ? '400px' : '44px';

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-300 font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Top Bar with Tabs */}
      <div className="flex-none border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl z-50">
        <div className="max-w-400 mx-auto px-4 pt-3 pb-3 flex flex-col gap-3">
          {/* Header row: logo + tabs + collapse */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 flex-none">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                <Database className="text-white w-4 h-4" />
              </div>
              <span className="text-sm font-black text-white tracking-tighter hidden sm:block">{t.appName}</span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('analyzer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                  activeTab === 'analyzer'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {t.tabAnalyzer}
              </button>
              <button
                onClick={() => setActiveTab('dependencies')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all ${
                  activeTab === 'dependencies'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                {t.tabDependencies}
              </button>
            </div>

            <div className="flex-1" />

            {/* Language dropdown */}
            <Select value={lang} onValueChange={v => setLang(v as Lang)}>
              <SelectTrigger className="gap-1.5">
                <Languages className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            {/* Collapse button — only relevant for analyzer tab */}
            {activeTab === 'analyzer' && (
              <button
                onClick={() => setInputOpen(v => !v)}
                title={inputOpen ? t.collapseInput : t.expandInput}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
              >
                {inputOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Analyzer input — only in analyzer tab */}
          {activeTab === 'analyzer' && inputOpen && (
            <div className="relative">
              <textarea
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                placeholder={t.placeholder}
                className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 pb-14 pr-44 font-mono text-sm text-zinc-400 focus:outline-none focus:border-blue-500/50 transition-colors resize-none shadow-inner subtle-scrollbar"
              />
              <div className="absolute top-3 right-3 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800">SQL MODE</Badge>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="absolute bottom-3 right-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-white font-black text-sm rounded-lg transition-all flex items-center gap-2.5 shadow-lg shadow-blue-900/30 active:scale-95"
              >
                {isAnalyzing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                {isAnalyzing ? t.analyzing : t.analyzeScript}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'dependencies' && <DependencyGraph />}

        {activeTab === 'analyzer' && parsed && (
          <div className="h-full max-w-400 mx-auto p-4 flex flex-col">
            {/* Header */}
            <div className="flex-none mb-4 relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-blue-600 rounded-full" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight">{parsed.name}</h2>
                <span className="text-zinc-500 font-mono text-sm">[{parsed.type}]</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Database className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{parsed.databaseContext || t.defaultContext}</span>
                </div>
                <div className="h-1 w-1 rounded-full bg-zinc-700" />
                <div className="text-[10px] text-zinc-500 font-medium">{t.analyzedOn} {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div
              className="flex-1 grid gap-6 min-h-0 pb-16"
              style={{ gridTemplateColumns: `${sidebarWidth} 1fr ${codeWidth}` }}
            >
              {/* Left Panel: Parameters & Variables */}
              <Sidebar parsed={parsed} isOpen={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />

              {/* Center: Flow Diagram */}
              <div className="h-full overflow-auto custom-scrollbar bg-zinc-950/50 rounded-3xl border border-zinc-800/50 p-6 relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
                <div className="relative z-10 min-w-fit">
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
                    <div className="flex flex-col items-center justify-center h-100 text-zinc-600">
                      <Workflow className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">{t.noNodes}</p>
                      <p className="text-xs opacity-50">{t.noNodesHint}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel: Code View */}
              <CodeView
                sqlLines={sqlLines}
                selectedNode={selectedNode}
                codeLinesRef={codeLinesRef}
                isOpen={codeOpen}
                onToggle={() => setCodeOpen(v => !v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Execution Summary Footer — only in analyzer tab */}
      {activeTab === 'analyzer' && parsed && <SummaryFooter parsed={parsed} />}
    </div>
  );
}
