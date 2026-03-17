import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  FolderOpen, FileCode2, GitBranch, Search, X,
  UploadCloud, RefreshCw, ExternalLink, Info, Minus,
} from 'lucide-react';
import {
  parseSQLFiles, computeLayout, DependencyMap, CARD_W, CARD_H,
} from '../services/dependencyParser';
import { useLang } from '../i18n';

export const DependencyGraph: React.FC = () => {
  const { t } = useLang();
  const [depMap, setDepMap] = useState<DependencyMap | null>(null);
  const [search, setSearch] = useState('');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async (fileList: FileList | File[]) => {
    const sqlFiles: { name: string; content: string }[] = [];
    const files = Array.from(fileList).filter(f =>
      f.name.toLowerCase().endsWith('.sql')
    );
    for (const file of files) {
      const content = await file.text();
      sqlFiles.push({ name: file.name, content });
    }
    if (sqlFiles.length > 0) {
      setDepMap(parseSQLFiles(sqlFiles));
      setSelectedNode(null);
      setHoveredNode(null);
    }
  }, []);

  const onFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) loadFiles(e.target.files);
  };

  const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) loadFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files: File[] = [];
    const items = e.dataTransfer.items;
    if (items) {
      for (const item of Array.from(items) as DataTransferItem[]) {
        const entry = (item as unknown as { webkitGetAsEntry?(): FileSystemEntry | null }).webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          readDirRecursive(entry as FileSystemDirectoryEntry, files).then(() => loadFiles(files));
          return;
        }
        const f = (item as unknown as { getAsFile(): File | null }).getAsFile();
        if (f) files.push(f);
      }
    }
    loadFiles(files);
  };

  function readDirRecursive(dir: FileSystemDirectoryEntry, acc: File[]): Promise<void> {
    return new Promise(resolve => {
      const reader = dir.createReader();
      reader.readEntries(entries => {
        const promises = entries.map(entry => {
          if (entry.isFile) {
            return new Promise<void>(res => {
              (entry as FileSystemFileEntry).file(f => { acc.push(f); res(); });
            });
          } else if (entry.isDirectory) {
            return readDirRecursive(entry as FileSystemDirectoryEntry, acc);
          }
          return Promise.resolve();
        });
        Promise.all(promises).then(() => resolve());
      });
    });
  }

  const { layout, isolatedNodes, totalWidth, totalHeight } = useMemo(() => {
    if (!depMap) return { layout: new Map(), isolatedNodes: [], totalWidth: 0, totalHeight: 0 };
    return computeLayout(depMap);
  }, [depMap]);

  const filteredNames = useMemo(() => {
    if (!depMap) return new Set<string>();
    if (!search.trim()) return new Set(depMap.keys());
    const q = search.toLowerCase();
    return new Set([...depMap.entries()]
      .filter(([k, sp]) => k.includes(q) || (sp.homeDatabase?.toLowerCase().includes(q) ?? false))
      .map(([k]) => k)
    );
  }, [depMap, search]);

  const activeNode = hoveredNode ?? selectedNode;

  // Arrows to draw
  const arrows = useMemo(() => {
    if (!layout.size) return [];
    const result: { from: string; to: string; highlighted: boolean; faded: boolean }[] = [];
    for (const [name, node] of layout) {
      if (!filteredNames.has(name)) continue;
      for (const call of node.sp.calls) {
        if (!layout.has(call)) continue;
        const highlighted = activeNode === name || activeNode === call;
        const faded = !!activeNode && !highlighted;
        result.push({ from: name, to: call, highlighted, faded });
      }
    }
    return result;
  }, [layout, activeNode, filteredNames]);

  const stats = useMemo(() => {
    if (!depMap) return null;
    const defined = [...depMap.values()].filter(n => n.definedInProject).length;
    const external = [...depMap.values()].filter(n => !n.definedInProject).length;
    const edges = [...depMap.values()].reduce((s, n) => s + n.calls.length, 0);
    const isolated = isolatedNodes.length;
    return { defined, external, edges, isolated };
  }, [depMap, isolatedNodes]);

  const selectedSP = selectedNode ? depMap?.get(selectedNode) : null;

  if (!depMap) {
    return (
      <div
        className={`flex-1 flex flex-col items-center justify-center gap-6 p-8 transition-colors ${isDragging ? 'bg-blue-950/20' : ''}`}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 border-dashed transition-colors ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 bg-zinc-900/50'}`}>
          <UploadCloud className={`w-10 h-10 transition-colors ${isDragging ? 'text-blue-400' : 'text-zinc-600'}`} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white tracking-tight mb-1">{t.loadTitle}</h2>
          <p className="text-sm text-zinc-500 max-w-sm">{t.loadDesc}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-900/20"
          >
            <FolderOpen className="w-4 h-4" /> {t.loadFolder}
          </button>
          <button
            onClick={() => filesInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black text-sm rounded-lg transition-all active:scale-95 border border-zinc-700"
          >
            <FileCode2 className="w-4 h-4" /> {t.selectFiles}
          </button>
        </div>
        <input ref={folderInputRef} type="file" className="hidden"
          /* @ts-ignore */
          webkitdirectory="" directory="" multiple onChange={onFolderChange} />
        <input ref={filesInputRef} type="file" className="hidden"
          multiple accept=".sql" onChange={onFilesChange} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex-none flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <GitBranch className="w-3.5 h-3.5 text-blue-500" />
          <span className="font-bold text-white">{stats?.defined}</span> {t.scripts}
          {stats?.external ? (
            <>
              <span className="text-zinc-600">·</span>
              <span className="font-bold text-zinc-400">{stats.external}</span>
              <span className="text-zinc-500">{t.external}</span>
            </>
          ) : null}
          <span className="text-zinc-600">·</span>
          <span className="font-bold text-zinc-400">{stats?.edges}</span> {t.dependencies}
          {stats?.isolated ? (
            <>
              <span className="text-zinc-600">·</span>
              <span className="font-bold text-zinc-600">{stats.isolated}</span>
              <span className="text-zinc-600">{t.isolated}</span>
            </>
          ) : null}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="h-7 pl-8 pr-7 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-blue-500/60 w-48"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => { setDepMap(null); setSelectedNode(null); }}
          title={t.loadNewFiles}
          className="h-7 px-2.5 flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> {t.reset}
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Isolated SPs panel */}
        {isolatedNodes.length > 0 && (
          <div className="flex-none w-52 border-r border-zinc-800 bg-zinc-900/20 flex flex-col min-h-0">
            <div className="flex-none px-3 py-2.5 border-b border-zinc-800 flex items-center gap-2">
              <Minus className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                {t.isolatedLabel} ({isolatedNodes.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto subtle-scrollbar p-2 space-y-1.5">
              {isolatedNodes
                .filter(sp => !search.trim() || sp.name.includes(search.toLowerCase()) || (sp.homeDatabase?.toLowerCase().includes(search.toLowerCase()) ?? false))
                .map(sp => (
                  <button
                    key={sp.name}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(prev => prev === sp.name ? null : sp.name); }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                      selectedNode === sp.name
                        ? 'bg-zinc-800 border-blue-500/60 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="font-bold truncate">{sp.displayName}</div>
                    {sp.homeDatabase && (
                      <div className="text-[9px] text-blue-400/70 font-mono truncate mt-0.5">{sp.homeDatabase}</div>
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Graph canvas */}
        <div
          className="flex-1 overflow-auto subtle-scrollbar p-6"
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="relative"
            style={{ width: totalWidth + 60, height: totalHeight + 60 }}
          >
            {/* SVG arrows */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalWidth + 60}
              height={totalHeight + 60}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker id="arrow-normal" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#52525b" />
                </marker>
                <marker id="arrow-hi" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#3b82f6" />
                </marker>
                <marker id="arrow-faded" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="#27272a" />
                </marker>
              </defs>
              {arrows.map(({ from, to, highlighted, faded }, i) => {
                const src = layout.get(from);
                const tgt = layout.get(to);
                if (!src || !tgt) return null;
                const x1 = src.x + CARD_W + 30;
                const y1 = src.y + CARD_H / 2 + 30;
                const x2 = tgt.x + 30;
                const y2 = tgt.y + CARD_H / 2 + 30;
                const dx = Math.abs(x2 - x1) * 0.5;
                const d = `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
                const color = faded ? '#27272a' : highlighted ? '#3b82f6' : '#3f3f46';
                const markerId = faded ? 'arrow-faded' : highlighted ? 'arrow-hi' : 'arrow-normal';
                return (
                  <path
                    key={i}
                    d={d}
                    stroke={color}
                    strokeWidth={highlighted ? 2 : 1.5}
                    fill="none"
                    markerEnd={`url(#${markerId})`}
                    style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
                  />
                );
              })}
            </svg>

            {/* Node cards */}
            {[...layout.entries()].map(([name, node]) => {
              const sp = node.sp;
              const isFiltered = !filteredNames.has(name);
              const isHovered = hoveredNode === name;
              const isSelected = selectedNode === name;
              const isConnected = activeNode
                ? layout.get(activeNode)?.sp.calls.includes(name) ||
                  depMap?.get(activeNode)?.calls.includes(name) ||
                  (depMap?.get(name)?.calls.includes(activeNode!) ?? false)
                : false;
              const isFaded = !!activeNode && !isHovered && !isSelected && !isConnected && activeNode !== name;

              return (
                <div
                  key={name}
                  className={`absolute rounded-xl border px-3 py-2 cursor-pointer select-none transition-all duration-150 ${
                    isFiltered ? 'opacity-20 pointer-events-none' : ''
                  } ${
                    isFaded ? 'opacity-25' : ''
                  } ${
                    sp.definedInProject
                      ? `bg-zinc-900 ${isSelected ? 'border-blue-500' : isHovered ? 'border-zinc-500' : 'border-zinc-700'}`
                      : `bg-zinc-950 border-dashed ${isSelected ? 'border-blue-500/70' : isHovered ? 'border-zinc-500' : 'border-zinc-700'}`
                  }`}
                  style={{
                    left: node.x + 30,
                    top: node.y + 30,
                    width: CARD_W,
                    height: CARD_H,
                    boxShadow: isSelected ? '0 0 0 2px rgba(59,130,246,0.3)' : undefined,
                  }}
                  onMouseEnter={() => setHoveredNode(name)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => { e.stopPropagation(); setSelectedNode(prev => prev === name ? null : name); }}
                >
                  <div className="flex items-center gap-2 h-full">
                    <div className={`w-6 h-6 flex-none rounded flex items-center justify-center ${sp.definedInProject ? 'bg-blue-600/20' : 'bg-zinc-800'}`}>
                      {sp.definedInProject
                        ? <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                        : <ExternalLink className="w-3 h-3 text-zinc-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      {sp.homeDatabase && (
                        <div className="text-[9px] text-blue-400/60 font-mono truncate leading-none mb-0.5">
                          {sp.homeDatabase}
                        </div>
                      )}
                      <div className={`text-xs font-black truncate leading-tight ${sp.definedInProject ? 'text-white' : 'text-zinc-400'}`}>
                        {sp.displayName}
                      </div>
                    </div>
                    {sp.calls.length > 0 && (
                      <div className="flex-none text-[9px] font-black text-blue-400 bg-blue-950/50 border border-blue-900/50 rounded px-1.5 py-0.5">
                        {sp.calls.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side detail panel */}
        {selectedSP && (
          <div className="flex-none w-80 border-l border-zinc-800 bg-zinc-900/30 p-4 overflow-y-auto subtle-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-zinc-500 flex-none" />
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">{t.details}</h3>
              </div>
              <button onClick={() => setSelectedNode(null)} className="text-zinc-600 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SP name + file */}
            <div className="mb-4">
              <p className="text-sm font-black text-white break-all">{selectedSP.displayName}</p>
              {selectedSP.homeDatabase && (
                <p className="text-[10px] text-blue-400/80 font-mono mt-0.5">{selectedSP.homeDatabase}</p>
              )}
              {selectedSP.definedInProject && (
                <p className="text-[10px] text-zinc-500 mt-0.5 break-all">{selectedSP.filePath}</p>
              )}
              {!selectedSP.definedInProject && (
                <span className="inline-block mt-1 text-[9px] font-bold uppercase text-yellow-500 bg-yellow-950/40 border border-yellow-900/50 rounded px-1.5 py-0.5">
                  {t.externalBadge}
                </span>
              )}
            </div>

            {/* Calls */}
            {selectedSP.calls.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">{t.callsLabel} ({selectedSP.calls.length})</p>
                <div className="space-y-1.5">
                  {selectedSP.calls.map(call => {
                    const calledSP = depMap?.get(call);
                    return (
                      <button
                        key={call}
                        onClick={() => setSelectedNode(call)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          calledSP?.definedInProject
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                            : 'bg-zinc-950 border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        <span className="font-bold">{calledSP?.displayName ?? call}</span>
                        {!calledSP?.definedInProject && (
                          <span className="ml-1 text-[9px] text-yellow-600">{t.externalSmall}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Called by + code snippets */}
            {(() => {
              const callers = depMap
                ? [...depMap.values()].filter(n => n.calls.includes(selectedNode!))
                : [];
              if (!callers.length) return null;
              return (
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
                    {t.calledByLabel} ({callers.length})
                  </p>
                  <div className="space-y-3">
                    {callers.map(caller => {
                      const snippets = caller.callSnippets[selectedNode!] ?? [];
                      return (
                        <div key={caller.name} className="rounded-lg border border-zinc-800 overflow-hidden">
                          {/* Caller header */}
                          <button
                            onClick={() => setSelectedNode(caller.name)}
                            className="w-full text-left px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-between"
                          >
                            <span className="text-xs font-black text-zinc-200">{caller.displayName}</span>
                            <span className="text-[9px] text-zinc-500 font-mono">{caller.filePath}</span>
                          </button>

                          {/* Code snippets */}
                          {snippets.map((snippet, si) => (
                            <div key={si} className="bg-zinc-950 border-t border-zinc-800">
                              <div className="px-2 py-1 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                <span className="text-[9px] font-mono text-zinc-500">
                                  {t.line} {snippet.startLine}
                                  {snippets.length > 1 ? ` (${t.occurrence} ${si + 1})` : ''}
                                </span>
                              </div>
                              <div className="overflow-x-auto subtle-scrollbar">
                                <pre className="p-2 text-[10px] font-mono leading-relaxed text-zinc-400 whitespace-pre min-w-fit">
                                  {snippet.lines.map((line, li) => {
                                    const lineNo = snippet.startLine - snippet.execLineOffset + li;
                                    const isExecLine = li === snippet.execLineOffset;
                                    return (
                                      <div
                                        key={li}
                                        className={`flex gap-2 px-1 rounded ${isExecLine ? 'bg-yellow-500/15 text-yellow-200' : ''}`}
                                      >
                                        <span className="w-8 flex-none text-right text-zinc-700 select-none border-r border-zinc-800 pr-1.5 mr-0.5">
                                          {lineNo}
                                        </span>
                                        <span>{line || ' '}</span>
                                      </div>
                                    );
                                  })}
                                </pre>
                              </div>
                            </div>
                          ))}

                          {snippets.length === 0 && (
                            <p className="px-2.5 py-2 text-[10px] text-zinc-600 italic">{t.noSnippet}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
