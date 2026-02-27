import React from 'react';
import { LayoutDashboard, Receipt, PlusCircle, CreditCard, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAddTransaction: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser, 
  onLogout, 
  activeTab, 
  setActiveTab,
  onAddTransaction
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'receitas', label: 'Receitas', icon: Receipt },
    { id: 'despesas', label: 'Despesas', icon: CreditCard },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0f172a] text-gray-300 flex flex-col justify-between z-20 transition-all">
      <div>
        {/* Logo area */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/30">
            C
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Con<span className="text-violet-400">Finance</span>
          </h1>
        </div>

        {/* Navigation */}
        <div className="px-4 mt-6">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Principal
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/50' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={onAddTransaction}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
            >
              <PlusCircle size={20} />
              <span className="font-medium">Registrar Movimento</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-xl p-3 flex items-center gap-3 border border-slate-700/50">
          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-bold">
            {currentUser.avatarInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-gray-400 truncate">Plano Premium</p>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};