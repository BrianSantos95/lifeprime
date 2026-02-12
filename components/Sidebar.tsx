import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Settings,
  User,
  Activity,
  DollarSign,
  Bot
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const getButtonClass = (page: string) => {
    const isActive = activePage === page;
    return `p-2 rounded-lg transition-colors ${isActive
        ? 'bg-red-500/10 text-red-500'
        : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50'
      }`;
  };

  return (
    <aside className="w-16 flex flex-col items-center py-8 border-r border-zinc-900 bg-[#0d0d0d] hidden sm:flex">
      <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center mb-12 shadow-lg shadow-red-900/20 cursor-pointer" onClick={() => onNavigate('dashboard')}>
        <Activity className="text-white" size={24} />
      </div>
      <nav className="flex flex-col gap-8 flex-1">
        <button
          onClick={() => onNavigate('dashboard')}
          className={getButtonClass('dashboard')}
        >
          <LayoutDashboard size={24} />
        </button>
        <button
          onClick={() => onNavigate('finance')}
          className={getButtonClass('finance')}
          title="Financeiro"
        >
          <DollarSign size={24} />
        </button>
        <button
          onClick={() => onNavigate('agent')}
          className={getButtonClass('agent')}
          title="Agente IA"
        >
          <Bot size={24} />
        </button>
        <button
          onClick={() => onNavigate('calendar')}
          className={getButtonClass('calendar')}
        >
        </button>
        <button
          onClick={() => onNavigate('profile')}
          className={getButtonClass('profile')}
        >
          <User size={22} />
        </button>
      </nav>
      <button
        onClick={() => onNavigate('settings')}
        className={getButtonClass('settings')}
      >
        <Settings size={22} />
      </button>
    </aside>
  );
};

export default Sidebar;