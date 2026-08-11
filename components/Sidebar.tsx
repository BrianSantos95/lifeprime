import React from 'react';
import {
  LayoutDashboard,
  BriefcaseBusiness,
  User,
  Activity,
  DollarSign,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, onSignOut }) => {
  const getButtonClass = (page: string) => {
    const base = "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-medium text-sm relative group ";
    return activePage === page
      ? base + "bg-gradient-to-r from-blue-600/20 to-indigo-600/10 text-white border border-blue-500/35 shadow-[0_0_18px_rgba(59,130,246,0.22)] font-semibold"
      : base + "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]";
  };

  const getIconClass = (page: string) => {
    return activePage === page ? "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "text-slate-400 group-hover:text-slate-200";
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0b0e18]/80 backdrop-blur-2xl border-r border-white/[0.07] h-full justify-between p-5 select-none z-20">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/30">
            <Sparkles size={20} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1 font-sans">
              Life<span className="text-blue-400">Prime</span>
            </h1>
            <p className="text-[11px] font-semibold text-blue-400/80 uppercase tracking-wider">High Performance</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2">
          <button onClick={() => onNavigate('dashboard')} className={getButtonClass('dashboard')} title="Dashboard">
            <LayoutDashboard size={20} className={getIconClass('dashboard')} />
            <span className="text-sm">Dashboard</span>
            {activePage === 'dashboard' && (
              <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
            )}
          </button>

          <button onClick={() => onNavigate('finance')} className={getButtonClass('finance')} title="Financeiro">
            <DollarSign size={20} className={getIconClass('finance')} />
            <span className="text-sm">Financeiro</span>
            {activePage === 'finance' && (
              <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
            )}
          </button>

          <button onClick={() => onNavigate('calendar')} className={getButtonClass('calendar')} title="Calendário">
            <BriefcaseBusiness size={20} className={getIconClass('calendar')} />
            <span className="text-sm">Calendário</span>
            <span className="text-sm absolute left-[52px] bg-[#0b0e18] pr-4">Clientes</span>
            {activePage === 'calendar' && (
              <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
            )}
          </button>

          <button onClick={() => onNavigate('profile')} className={getButtonClass('profile')}>
            <User size={20} className={getIconClass('profile')} />
            <span className="text-sm">Perfil</span>
            {activePage === 'profile' && (
              <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
            )}
          </button>
        </nav>
      </div>

      {/* Footer / SignOut */}
      <div className="pt-4 border-t border-white/[0.06]">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded-2xl transition-all duration-200 text-sm font-medium"
          title="Sair"
        >
          <LogOut size={19} />
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
