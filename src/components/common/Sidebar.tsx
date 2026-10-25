import React from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Cpu,
  FolderGit2,
  LayoutDashboard,
  ListTodo,
  MessageSquareCode,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActiveView } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    tasks,
    staleTasksCount,
    projects,
    selectedProject,
    setSelectedProject,
  } = useApp();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: 'ダッシュボード',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'chat',
      label: 'AIチャット指令',
      icon: <MessageSquareCode className="w-4 h-4" />,
    },
    {
      id: 'tasks',
      label: 'タスク一元管理',
      icon: <ListTodo className="w-4 h-4" />,
      badge: tasks.length,
    },
    {
      id: 'usage',
      label: 'AI利用状況',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'artifacts',
      label: '成果物・PR一覧',
      icon: <FolderGit2 className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: '設定・バックアップ',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-53px)] select-none">
      {/* Navigation */}
      <div className="p-3 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1.5 tracking-wider">
          メニュー
        </div>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stale Task Warning Banner (if any) */}
      {staleTasksCount > 0 && (
        <div className="mx-3 my-1 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>停滞タスクあり ({staleTasksCount}件)</span>
          </div>
          <div className="text-[11px] text-rose-200/80 mt-1">
            2時間以上更新のない作業があります。状態確認を行ってください。
          </div>
          <button
            onClick={() => setActiveView('tasks')}
            className="mt-2 w-full py-1 text-center text-[11px] font-medium bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 rounded transition-colors cursor-pointer"
          >
            タスクを確認する →
          </button>
        </div>
      )}

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            プロジェクト
          </span>
          <span className="text-[10px] text-slate-400">{projects.length}件</span>
        </div>
        <button
          onClick={() => setSelectedProject('all')}
          className={`w-full text-left px-3 py-1.5 rounded-md text-xs truncate transition-colors cursor-pointer ${
            selectedProject === 'all'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          🌐 すべて表示
        </button>
        {projects.map((p) => {
          const isSelected = selectedProject === p.name;
          const count = tasks.filter((t) => t.project === p.name).length;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.name)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <span className="truncate flex-1 text-left">{p.name}</span>
              {count > 0 && (
                <span className="text-[10px] text-slate-400 font-mono ml-1">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>TOMORI Core v1.0</span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Ready
        </span>
      </div>
    </aside>
  );
};
