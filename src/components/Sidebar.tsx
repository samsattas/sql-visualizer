import React from 'react';
import { Settings2, Variable, Table as TableIcon } from 'lucide-react';
import { ParsedSQL } from '../types';
import { Badge } from './Badge';

interface SidebarProps {
  parsed: ParsedSQL;
}

export const Sidebar: React.FC<SidebarProps> = ({ parsed }) => {
  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-2 space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Parameters</h3>
        </div>
        <div className="space-y-2">
          {parsed.parameters.length > 0 ? parsed.parameters.map((p, i) => (
            <div key={i} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white truncate">@{p.name.replace('@', '')}</span>
                <Badge className={
                  p.category === 'OUTPUT' ? 'bg-green-950 text-green-400 border-green-900' :
                  p.category === 'OPTIONAL' ? 'bg-yellow-950 text-yellow-400 border-yellow-900' :
                  'bg-blue-950 text-blue-400 border-blue-900'
                }>
                  {p.category}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500">{p.type}</span>
                {p.defaultValue && <span className="text-[10px] text-zinc-600">def: {p.defaultValue}</span>}
              </div>
            </div>
          )) : (
            <div className="text-xs text-zinc-600 italic p-4 border border-dashed border-zinc-800 rounded-lg text-center">No parameters detected</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Variable className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Internal Variables</h3>
        </div>
        <div className="space-y-2">
          {parsed.variables.length > 0 ? parsed.variables.map((v, i) => (
            <div key={i} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-zinc-200">{v.name}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <span className="text-[10px] font-mono text-zinc-600 uppercase">{v.type}</span>
            </div>
          )) : (
            <div className="text-xs text-zinc-600 italic p-4 border border-dashed border-zinc-800 rounded-lg text-center">No variables declared</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <TableIcon className="w-4 h-4 text-zinc-500" />
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Data Map</h3>
        </div>
        <div className="space-y-4">
          {parsed.tables.length > 0 ? parsed.tables.map((t, i) => (
            <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-30 transition-opacity">
                <TableIcon className="w-8 h-8" />
              </div>
              <div className="mb-2">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter block">{t.database}</span>
                <span className="text-lg font-black text-white leading-tight">{t.name}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {Array.from(t.operations).map((op, j) => (
                  <Badge key={j} className={
                    op === 'WRITE' ? 'bg-orange-950 text-orange-400 border-orange-900' :
                    op === 'DELETE' ? 'bg-purple-950 text-purple-400 border-purple-900' :
                    'bg-blue-950 text-blue-400 border-blue-900'
                  }>
                    {op}
                  </Badge>
                ))}
              </div>
            </div>
          )) : (
            <div className="text-xs text-zinc-600 italic p-4 border border-dashed border-zinc-800 rounded-lg text-center">No tables detected</div>
          )}
        </div>
      </section>
    </div>
  );
};
