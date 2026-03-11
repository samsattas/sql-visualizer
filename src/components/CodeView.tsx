import React from 'react';
import { Code2 } from 'lucide-react';
import { SQLNode } from '../types';
import { Badge } from './Badge';

interface CodeViewProps {
  sqlLines: string[];
  selectedNode: SQLNode | null;
  codeLinesRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export const CodeView: React.FC<CodeViewProps> = ({ sqlLines, selectedNode, codeLinesRef }) => {
  return (
    <div className="h-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      <div className="flex-none p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Source Code</h3>
        </div>
        {selectedNode && (
          <Badge className="bg-yellow-950/30 text-yellow-500 border-yellow-900/50 lowercase">
            {selectedNode.startLine === selectedNode.endLine 
              ? `line ${selectedNode.startLine + 1}` 
              : `lines ${selectedNode.startLine + 1}-${selectedNode.endLine + 1}`}
          </Badge>
        )}
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
