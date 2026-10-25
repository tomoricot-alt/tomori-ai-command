import React from 'react';
import {
  Cpu,
  FolderGit2,
  LayoutDashboard,
  ListTodo,
  MessageSquareCode,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveView } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeView, setActiveView, tasks, staleTasksCount } = useApp();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'ホーム',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'chat',
      label: 'チャット',
      icon: <MessageSquareCode className="w-5 h-5" />,
    },
    {
      id: 'tasks',
      label: 'タスク',
      icon: <ListTodo className="w-5 h-5" />,
      badge: staleTasksCount > 0 ? staleTasksCount : undefined,
    },
    {
      id: 'usage',
      label: '利用状況',
      icon: <Cpu className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: '設定',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 md:hidden pb-safe">
      <div className="grid grid-cols-5 h-14">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 relative cursor-pointer ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
