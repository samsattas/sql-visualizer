import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: string;
  headerColor?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", header, headerColor = "zinc" }) => {
  const colorMap: Record<string, string> = {
    blue: "border-l-blue-500 bg-blue-950/20",
    orange: "border-l-orange-500 bg-orange-950/20",
    red: "border-l-red-500 bg-red-950/20",
    purple: "border-l-purple-500 bg-purple-950/20",
    yellow: "border-l-yellow-500 bg-yellow-950/20",
    green: "border-l-green-500 bg-green-950/20",
    cyan: "border-l-cyan-500 bg-cyan-950/20",
    amber: "border-l-amber-500 bg-amber-950/20",
    rose: "border-l-rose-500 bg-rose-950/20",
    emerald: "border-l-emerald-500 bg-emerald-950/20",
    zinc: "border-l-zinc-500 bg-zinc-900",
    white: "border-l-zinc-300 bg-zinc-800"
  };

  const headerBgMap: Record<string, string> = {
    blue: "bg-blue-950 text-blue-300",
    orange: "bg-orange-950 text-orange-300",
    red: "bg-red-950 text-red-300",
    purple: "bg-purple-950 text-purple-300",
    yellow: "bg-yellow-950 text-yellow-300",
    green: "bg-green-950 text-green-300",
    cyan: "bg-cyan-950 text-cyan-300",
    amber: "bg-amber-950 text-amber-300",
    rose: "bg-rose-950 text-rose-300",
    emerald: "bg-emerald-950 text-emerald-300",
    zinc: "bg-zinc-800 text-zinc-400",
    white: "bg-zinc-700 text-zinc-200"
  };

  return (
    <div className={`rounded-lg border border-zinc-800 overflow-hidden border-l-4 min-w-65 ${colorMap[headerColor] || colorMap.zinc} ${className}`}>
      {header && (
        <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800/50 ${headerBgMap[headerColor] || headerBgMap.zinc}`}>
          {header}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
