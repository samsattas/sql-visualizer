import React from 'react';
import { motion } from 'motion/react';
import { SQLNode, NodeType } from '../types';
import { Card } from './Card';
import { Badge } from './Badge';
import { NodeIcon } from './NodeIcon';

interface FlowNodeProps {
  node: SQLNode;
  index: number;
  total: number;
  onNodeClick?: (node: SQLNode) => void;
  selectedNodeId?: string | null;
}

export const FlowNode: React.FC<FlowNodeProps> = ({ node, index, total, onNodeClick, selectedNodeId }) => {
  const colorKey: Record<NodeType, string> = {
    SELECT: 'blue',
    INSERT: 'orange',
    UPDATE: 'red',
    DELETE: 'purple',
    IF: 'yellow',
    ELSE: 'yellow',
    WHILE: 'cyan',
    CURSOR: 'amber',
    TRY: 'zinc',
    CATCH: 'zinc',
    TRY_CATCH: 'zinc',
    EXEC: 'green',
    SET: 'zinc',
    DECLARE: 'zinc',
    TRANSACTION: 'emerald',
    ERROR: 'red',
    BLOCK: 'zinc',
    ROOT: 'zinc',
    RAISERROR: 'rose',
    THROW: 'rose',
    RETURN: 'zinc',
    PRINT: 'zinc'
  };

  const isContainer = ['BLOCK', 'TRY', 'CATCH', 'TRY_CATCH', 'TRANSACTION', 'IF', 'ELSE', 'WHILE'].includes(node.type);
  const isSelected = selectedNodeId === node.id;
  
  if (node.type === 'DECLARE') {
    return (
      <div className="w-full mb-4" onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}>
        <Card header="DECLARE" headerColor="zinc" className={`shadow-lg transition-all cursor-pointer ${isSelected ? 'ring-4 ring-yellow-500 scale-[1.02]' : 'hover:border-zinc-600'}`}>
          <div className="space-y-1">
            {node.variables?.map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-zinc-800/30 last:border-0">
                <span className="font-bold text-zinc-200">{v.name}</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">{v.type}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (node.type === 'IF') {
    return (
      <div className="w-full mb-8" onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}>
        <Card header="IF" headerColor="yellow" className={`shadow-xl transition-all cursor-pointer ${isSelected ? 'ring-4 ring-yellow-500 scale-[1.02]' : 'hover:border-yellow-900/50'}`}>
          <div className="mb-4 p-3 bg-yellow-950/20 border border-yellow-900/50 rounded-lg">
            <span className="text-[10px] text-yellow-500 font-black uppercase tracking-widest block mb-1">Condition</span>
            <code className="text-sm text-yellow-200 font-bold">{node.condition}</code>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-950 text-green-400 border-green-900">TRUE BRANCH</Badge>
              </div>
              <div className="pl-4 border-l border-zinc-800/50 space-y-4">
                {node.trueBranch?.map((child, i) => (
                  <FlowNode key={child.id} node={child} index={i} total={node.trueBranch!.length} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
                ))}
              </div>
            </div>
            
            {node.elseBranch && node.elseBranch.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-950 text-red-400 border-red-900">ELSE BRANCH</Badge>
                </div>
                <div className="pl-4 border-l border-zinc-800/50 space-y-4">
                  {node.elseBranch.map((child, i) => (
                    <FlowNode key={child.id} node={child} index={i} total={node.elseBranch!.length} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (node.type === 'TRY_CATCH') {
    return (
      <div className="w-full mb-8" onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}>
        <Card header="TRY / CATCH" headerColor="zinc" className={`shadow-xl border-dashed transition-all cursor-pointer ${isSelected ? 'ring-4 ring-yellow-500 scale-[1.02]' : 'hover:border-zinc-600'}`}>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">TRY BLOCK</Badge>
              </div>
              <div className="pl-4 border-l border-zinc-800/50 space-y-4">
                {node.trueBranch?.map((child, i) => (
                  <FlowNode key={child.id} node={child} index={i} total={node.trueBranch!.length} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-rose-950 text-rose-400 border-rose-900">CATCH BLOCK</Badge>
              </div>
              <div className="pl-4 border-l border-zinc-800/50 space-y-4">
                {node.elseBranch?.map((child, i) => (
                  <FlowNode key={child.id} node={child} index={i} total={node.elseBranch!.length} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`relative flex flex-col items-center w-full max-w-4xl mx-auto ${isContainer ? 'mb-8' : 'mb-4'}`} onClick={(e) => { e.stopPropagation(); onNodeClick?.(node); }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="w-full"
      >
        <Card 
          header={node.type} 
          headerColor={colorKey[node.type]} 
          className={`shadow-xl transition-all cursor-pointer ${isSelected ? 'ring-4 ring-yellow-500 scale-[1.02]' : 'hover:border-zinc-600'} ${node.type === 'TRY' ? 'border-dashed' : ''} ${node.type === 'TRANSACTION' ? 'border-emerald-700/50 bg-emerald-950/5' : ''}`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded bg-zinc-800/50 border border-zinc-700`}>
                <NodeIcon type={node.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black tracking-tight text-white truncate uppercase">
                    {node.title} {node.table ? `→ ${node.table}` : ''}
                  </h3>
                  {node.condition && (
                    <Badge className="bg-yellow-950/30 text-yellow-500 border-yellow-900/50 lowercase">
                      {node.condition}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {node.children.length > 0 && (
              <div className={`mt-2 ${node.type === 'ROOT' ? '' : 'pl-6 border-l border-zinc-800/50'} py-2`}>
                <div className="grid grid-cols-1 gap-4">
                  {node.children.map((child, i) => (
                    <FlowNode key={child.id} node={child} index={i} total={node.children.length} onNodeClick={onNodeClick} selectedNodeId={selectedNodeId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
