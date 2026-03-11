import React from 'react';
import { Code2, ChevronRight, ChevronLeft } from 'lucide-react';
import { SQLNode } from '../types';
import { Badge } from './Badge';

interface CodeViewProps {
  sqlLines: string[];
  selectedNode: SQLNode | null;
  codeLinesRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  isOpen: boolean;
  onToggle: () => void;
}

export const CodeView: React.FC<CodeViewProps> = ({ sqlLines, selectedNode, codeLinesRef, isOpen, onToggle }) => {
  if (!isOpen) {
    return (
      <div className="h-full flex flex-col items-center py-4 gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <button
          onClick={onToggle}
          title="Expand source code"
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest"
            style={{ writingMode: 'vertical-rl' }}
          >
            Source Code
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex-none p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Source Code</h3>
        </div>
        <div className="flex items-center gap-2">
          {selectedNode && (
            <Badge className="bg-yellow-950/30 text-yellow-500 border-yellow-900/50 lowercase">
              {selectedNode.startLine === selectedNode.endLine
                ? `line ${selectedNode.startLine + 1}`
                : `lines ${selectedNode.startLine + 1}-${selectedNode.endLine + 1}`}
            </Badge>
          )}
          <button
            onClick={onToggle}
            title="Collapse source code"
            className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed custom-scrollbar">
        {sqlLines.map((line, i) => {
          const isHighlighted = selectedNode && i >= selectedNode.startLine && i <= selectedNode.endLine;
          return (
            <div
              key={i}
              ref={el => codeLinesRef.current[i] = el}
              className={`flex gap-4 px-2 py-0.5 rounded transition-colors min-w-fit ${isHighlighted ? 'bg-yellow-500/20 text-yellow-200' : 'text-zinc-500 hover:bg-zinc-800/50'}`}
            >
              <span className="w-10 flex-none text-right opacity-30 select-none border-r border-zinc-800/50 pr-4">{i + 1}</span>
              <pre className="whitespace-pre select-text">{line || ' '}</pre>
            </div>
          );
        })}
      </div>
    </div>
  );
};
