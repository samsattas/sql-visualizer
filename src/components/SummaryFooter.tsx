import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ParsedSQL } from '../types';

interface SummaryFooterProps {
  parsed: ParsedSQL;
}

const StatTooltip = ({ label, color }: { label: string, color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 5, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 5, scale: 0.95 }}
    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-xl z-50 pointer-events-none"
  >
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
      {label}
    </div>
    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
  </motion.div>
);

const OperationStat = ({ count, label, color, dotColor }: { count: number, label: string, color: string, dotColor: string }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="relative flex items-center gap-1.5 cursor-help group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isHovered && <StatTooltip label={label} color={dotColor} />}
      </AnimatePresence>
      <div className={`w-2 h-2 rounded-full ${dotColor} group-hover:ring-4 group-hover:ring-${color}/20 transition-all`} />
      <span className="text-sm font-black text-white">{count}</span>
    </div>
  );
};

export const SummaryFooter: React.FC<SummaryFooterProps> = ({ parsed }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-[60] shadow-2xl">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Operations</span>
              <div className="flex items-center gap-4 mt-1">
                <OperationStat count={parsed.summary.selects} label="SELECT (READ)" color="blue-500" dotColor="bg-blue-500" />
                <OperationStat count={parsed.summary.inserts} label="INSERT (CREATE)" color="orange-500" dotColor="bg-orange-500" />
                <OperationStat count={parsed.summary.updates} label="UPDATE (MODIFY)" color="red-500" dotColor="bg-red-500" />
                <OperationStat count={parsed.summary.deletes} label="DELETE (REMOVE)" color="purple-500" dotColor="bg-purple-500" />
                <OperationStat count={parsed.summary.execs} label="EXEC (CALL)" color="cyan-500" dotColor="bg-cyan-500" />
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Databases</span>
              <span className="text-sm font-black text-white mt-1">{parsed.summary.databasesCount}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Tables</span>
              <span className="text-sm font-black text-white mt-1">{parsed.summary.tablesCount}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800" />

          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Error Handling</span>
              <span className={`text-sm font-black mt-1 ${parsed.summary.hasErrorHandling ? 'text-green-500' : 'text-zinc-600'}`}>
                {parsed.summary.hasErrorHandling ? 'ENABLED' : 'NONE'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Transactions</span>
              <span className={`text-sm font-black mt-1 ${parsed.summary.hasTransaction ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {parsed.summary.hasTransaction ? 'ACTIVE' : 'NONE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
