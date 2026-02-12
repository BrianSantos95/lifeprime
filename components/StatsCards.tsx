import React from 'react';
import { Activity, Calendar, Zap } from 'lucide-react';

interface StatsCardsProps {
  streak: number;
  todayCompleted: number;
  totalHabits: number;
  successRate: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ streak, todayCompleted, totalHabits, successRate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-[#111111] border border-zinc-900 p-5 rounded-2xl flex items-center gap-4 hover:border-emerald-900/50 transition-colors">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shadow-inner shadow-emerald-500/5">
          <Zap size={24} />
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Melhor Sequência</p>
          <h4 className="text-xl font-bold text-white">{streak} Dias</h4>
        </div>
      </div>

      <div className="bg-[#111111] border border-zinc-900 p-5 rounded-2xl flex items-center gap-4 hover:border-red-900/50 transition-colors">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500 shadow-inner shadow-red-500/5">
          <Calendar size={24} />
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Hoje</p>
          <h4 className="text-xl font-bold text-white">
            {todayCompleted} <span className="text-zinc-600 text-base font-medium">/ {totalHabits}</span>
          </h4>
        </div>
      </div>

      <div className="bg-[#111111] border border-zinc-900 p-5 rounded-2xl flex items-center gap-4 hover:border-blue-900/50 transition-colors">
        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 shadow-inner shadow-blue-500/5">
          <Activity size={24} />
        </div>
        <div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Taxa de Sucesso</p>
          <h4 className="text-xl font-bold text-white">
            {successRate}%
          </h4>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;