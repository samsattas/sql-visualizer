import React from 'react';
import { 
  Play, 
  Database, 
  ArrowRight, 
  Settings2, 
  AlertCircle,
  Activity,
  Layers,
  Terminal,
  Info,
  Workflow
} from 'lucide-react';
import { NodeType } from '../types';

interface NodeIconProps {
  type: NodeType;
}

export const NodeIcon: React.FC<NodeIconProps> = ({ type }) => {
  switch (type) {
    case 'SELECT': return <Layers className="w-4 h-4 text-blue-400" />;
    case 'INSERT': return <Play className="w-4 h-4 text-orange-400" />;
    case 'UPDATE': return <Activity className="w-4 h-4 text-red-400" />;
    case 'DELETE': return <AlertCircle className="w-4 h-4 text-purple-400" />;
    case 'IF': return <Workflow className="w-4 h-4 text-yellow-400" />;
    case 'WHILE': return <Activity className="w-4 h-4 text-cyan-400" />;
    case 'EXEC': return <Terminal className="w-4 h-4 text-green-400" />;
    case 'RAISERROR':
    case 'THROW': return <AlertCircle className="w-4 h-4 text-rose-400" />;
    case 'PRINT': return <Info className="w-4 h-4 text-zinc-400" />;
    case 'TRANSACTION': return <Database className="w-4 h-4 text-emerald-400" />;
    default: return <Settings2 className="w-4 h-4 text-zinc-400" />;
  }
};
