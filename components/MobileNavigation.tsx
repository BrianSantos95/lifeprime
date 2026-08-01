import React from 'react';
import { LayoutDashboard, DollarSign, Bot, User } from 'lucide-react';

interface MobileNavigationProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activePage, onNavigate }) => {
    const getButtonClass = (page: string) => {
        const isActive = activePage === page;
        return `flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all ${isActive ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.65)]' : 'text-zinc-500 hover:text-zinc-300'
            }`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-zinc-900 flex items-center justify-around px-2 z-50 sm:hidden safe-area-bottom">
            <button onClick={() => onNavigate('dashboard')} className={getButtonClass('dashboard')}>
                <LayoutDashboard size={22} />
                <span className="text-[10px] font-medium">Hábitos</span>
            </button>
            <button onClick={() => onNavigate('finance')} className={getButtonClass('finance')}>
                <DollarSign size={22} />
                <span className="text-[10px] font-medium">Finanças</span>
            </button>
            <button onClick={() => onNavigate('agent')} className={getButtonClass('agent')}>
                <Bot size={22} />
                <span className="text-[10px] font-medium">IA</span>
            </button>
            <button onClick={() => onNavigate('profile')} className={getButtonClass('profile')}>
                <User size={22} />
                <span className="text-[10px] font-medium">Perfil</span>
            </button>
        </div>
    );
};

export default MobileNavigation;
