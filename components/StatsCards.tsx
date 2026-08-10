import React from 'react';
import { Activity, Calendar, Zap, MoreHorizontal, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  streak: number;
  todayCompleted: number;
  totalHabits: number;
  successRate: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ streak, todayCompleted, totalHabits, successRate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Card 1: Streak */}
      <div className="dashboard-card p-5 relative overflow-hidden group">
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Zap size={22} className="fill-amber-400/20" />
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full badge-glow-green text-xs font-semibold">
            <TrendingUp size={12} />
            <span>+12%</span>
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Sequência Ativa</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold tracking-tight text-white">{streak}</h4>
            <span className="text-sm font-semibold text-amber-400">Dias em alta</span>
          </div>
        </div>
      </div>

      {/* Card 2: Today Tasks */}
      <div className="dashboard-card p-5 relative overflow-hidden group">
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Calendar size={22} />
          </div>
          <span className="px-2.5 py-1 rounded-full badge-glow-blue text-xs font-semibold">
            {todayCompleted === totalHabits && totalHabits > 0 ? 'Concluído' : 'Em andamento'}
          </span>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Hábitos de Hoje</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold tracking-tight text-white">{todayCompleted}</h4>
            <span className="text-slate-400 text-sm font-medium">/ {totalHabits} hábitos</span>
          </div>
        </div>
      </div>

      {/* Card 3: Success Rate */}
      <div className="dashboard-card p-5 relative overflow-hidden group">
        <div className="flex justify-between items-start mb-3">
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Activity size={22} />
          </div>
          <span className="px-2.5 py-1 rounded-full badge-glow-purple text-xs font-semibold">
            Meta Mensal
          </span>
        </div>
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Taxa de Sucesso</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-extrabold tracking-tight text-white">{successRate}%</h4>
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5">
              <TrendingUp size={12} /> Desempenho alto
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;

