import React from 'react';
import { LayoutDashboard, DollarSign, User } from 'lucide-react';

interface MobileNavigationProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({ activePage, onNavigate }) => {
    const getButtonClass = (page: string) => {
        const isActive = activePage === page;
        return `flex-1 flex flex-col items-center justify-center h-full gap-1 transition-all ${
            isActive 
                ? 'text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.7)] font-semibold' 
                : 'text-slate-500 hover:text-slate-300'
        }`;
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0b0e18]/90 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-3 z-50 sm:hidden">
            <button onClick={() => onNavigate('dashboard')} className={getButtonClass('dashboard')}>
                <LayoutDashboard size={20} />
                <span className="text-[10px]">Hábitos</span>
            </button>
            <button onClick={() => onNavigate('finance')} className={getButtonClass('finance')}>
                <DollarSign size={20} />
                <span className="text-[10px]">Finanças</span>
            </button>
            <button onClick={() => onNavigate('profile')} className={getButtonClass('profile')}>
                <User size={20} />
                <span className="text-[10px]">Perfil</span>
            </button>
        </div>
    );
};

export default MobileNavigation;
