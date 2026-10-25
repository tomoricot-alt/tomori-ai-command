import React from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Terminal,
} from 'lucide-react';
import { AI_SERVICES } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';

export const RightSidebar: React.FC = () => {
  const { tasks, isTaskStale, setSelectedTask, setIsDetailModalOpen, setActiveView } = useApp();

  const activeTasks = tasks.filter(
    (t) => t.status === '実行中' || t.status === '確認待ち' || t.status === '実行待ち'
  );

  return (
    <aside className="w-80 bg-slate-900/60 border-l border-slate-800 flex flex-col h-[calc(100vh-53px)] select-none">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            進行中タスク & AI状況
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
          {activeTasks.length}件稼働中
        </span>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTasks.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">現在稼働中のタスクはありません</div>
        ) : (
          activeTasks.map((task) => {
            const ai = AI_SERVICES[task.assignedAI];
            const stale = isTaskStale(task);

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setIsDetailModalOpen(true);
                }}
                className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-slate-600 bg-slate-800/40 ${
                  stale
                    ? 'border-rose-700/60 bg-rose-950/20'
                    : 'border-slate-800 hover:bg-slate-800/70'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono text-slate-400">{task.id}</span>
                  <div className="flex items-center gap-1.5">
                    {stale && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-semibold">
                        更新なし
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        task.status === '実行中'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : task.status === '確認待ち'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-xs font-medium text-slate-100 line-clamp-2 mb-2 leading-relaxed">
                  {task.title}
                </div>

                {/* Project & Assigned AI */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 truncate max-w-[120px]">{task.project}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: ai.color }}
                    ></span>
                    <span className="font-medium text-slate-200">{ai.name}</span>
                  </div>
                </div>

                {/* State confirmation status */}
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {task.isStatusConfirmed ? (
                      <span className="text-emerald-400/80">● 確認済</span>
                    ) : (
                      <span className="text-amber-400/90 font-medium">▲ 状態未確認</span>
                    )}
                  </span>
                  <span>{task.updatedAt.split(' ')[1] || task.updatedAt}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI Quick Launcher footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
        <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
          AI クイック起動
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11px]">
          <a
            href="https://chatgpt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 transition-colors"
          >
            <span>ChatGPT</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href="https://claude.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 transition-colors"
          >
            <span>Claude</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </a>
          <a
            href="https://gemini.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/60 transition-colors"
          >
            <span>Gemini</span>
            <ArrowUpRight className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>
    </aside>
  );
};
