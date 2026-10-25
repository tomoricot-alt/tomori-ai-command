import React from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    projects,
    selectedProject,
    setSelectedProject,
    tasks,
    staleTasksCount,
    setIsCreateModalOpen,
    isAuthenticated,
    logout,
    login,
  } = useApp();

  const runningCount = tasks.filter((t) => t.status === '実行中').length;
  const reviewCount = tasks.filter((t) => t.status === '確認待ち').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-wide text-white">TOMORI</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30">
                AI COMMAND
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">複数AI統合指揮・進捗管理</div>
          </div>
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative ml-2 sm:ml-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[160px] sm:max-w-[220px] truncate"
          >
            <option value="all">📁 すべてのプロジェクト</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.business === 'TOMORI' ? '🟣' : p.business === '補助金ポータル' ? '🟢' : '⚪'} {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status pills & Quick Actions */}
      <div className="flex items-center gap-2">
        {/* Quick status summary badge */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-950/40 border border-blue-800/40 text-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span>実行中 {runningCount}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
            <span>確認待ち {reviewCount}</span>
          </div>
          {staleTasksCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>更新なし {staleTasksCount}</span>
            </div>
          )}
        </div>

        {/* New Task Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新規タスク起票</span>
          <span className="sm:hidden">起票</span>
        </button>

        {/* Auth status toggle button */}
        <button
          onClick={() => {
            if (isAuthenticated) {
              logout();
            } else {
              login('2026');
            }
          }}
          title={isAuthenticated ? '認証済み（クリックでロック）' : '未認証（クリックで解除）'}
          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
            isAuthenticated
              ? 'bg-slate-800/60 border-emerald-500/40 text-emerald-400 hover:bg-slate-800'
              : 'bg-rose-950/40 border-rose-600/50 text-rose-300 hover:bg-rose-900/60'
          }`}
        >
          {isAuthenticated ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span className="hidden lg:inline text-[11px]">{isAuthenticated ? '認証済' : 'ロック'}</span>
        </button>
      </div>
    </header>
  );
};
