import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  ListTodo,
  MessageSquareCode,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { AI_SERVICE_LIST, AI_SERVICES } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';
import { Task } from '../../types';

export const DashboardView: React.FC = () => {
  const {
    tasks,
    aiUsage,
    staleTasksCount,
    isTaskStale,
    setActiveView,
    setSelectedTask,
    setIsDetailModalOpen,
    setIsCreateModalOpen,
  } = useApp();

  const totalCount = tasks.length;
  const runningCount = tasks.filter((t) => t.status === '実行中').length;
  const reviewCount = tasks.filter((t) => t.status === '確認待ち').length;
  const completedCount = tasks.filter((t) => t.status === '完了').length;
  const unconfirmedCount = tasks.filter((t) => !t.isStatusConfirmed).length;

  const staleTasks = tasks.filter(isTaskStale);

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* Welcome & Quick Action Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-5 md:p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TOMORI AI COMMAND 統合指揮
              </span>
              <span className="text-xs text-slate-400">JST {aiUsage.generated_at_jst.split(' ')[1] || 'リアルタイム'}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              AIワークスペース総括コントロール
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              ChatGPT・Codex・Claude Code・Gemini・Antigravityへの依頼・引き継ぎ・進捗を単一画面で指揮。
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveView('chat')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>AIチャット指令を開く</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>総タスク</span>
            <ListTodo className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{totalCount}</span>
            <span className="text-[11px] text-slate-400">件</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-blue-900/40 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-300 text-xs">
            <span>実行中</span>
            <Clock className="w-4 h-4 text-blue-400 animate-spin" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-400">{runningCount}</span>
            <span className="text-[11px] text-blue-300/80">件稼働</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-amber-900/40 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span>確認待ち</span>
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-400">{reviewCount}</span>
            <span className="text-[11px] text-amber-300/80">件要確認</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-emerald-900/40 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-300 text-xs">
            <span>完了</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400">{completedCount}</span>
            <span className="text-[11px] text-emerald-300/80">件完了</span>
          </div>
        </div>

        <div
          className={`col-span-2 md:col-span-1 rounded-xl p-3.5 flex flex-col justify-between border ${
            staleTasksCount > 0
              ? 'bg-rose-950/40 border-rose-800/60'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className={staleTasksCount > 0 ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
              更新なし / 停滞
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${staleTasksCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`}
            />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-bold ${
                staleTasksCount > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {staleTasksCount}
            </span>
            <span className="text-[11px] text-slate-400">件</span>
            {unconfirmedCount > 0 && (
              <span className="text-[10px] text-amber-400 ml-auto">
                (未確認: {unconfirmedCount})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stale Tasks Alert Section (if any) */}
      {staleTasks.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <h2 className="text-sm font-bold text-rose-200">
                停滞タスク（2時間以上進捗更新なし）
              </h2>
            </div>
            <span className="text-xs text-rose-300/80">状態確認または手動同期が必要です</span>
          </div>
          <div className="space-y-2">
            {staleTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setIsDetailModalOpen(true);
                }}
                className="bg-slate-900/90 border border-rose-800/40 hover:border-rose-600 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">{task.id}</span>
                  <div>
                    <div className="text-xs font-medium text-slate-100">{task.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {task.project} ｜ 担当: {AI_SERVICES[task.assignedAI].name} ｜ 最終確認:{' '}
                      <span className="text-amber-300">{task.lastConfirmedAt}</span>
                    </div>
                  </div>
                </div>
                <button className="text-xs bg-rose-900/50 hover:bg-rose-800 text-rose-200 px-3 py-1 rounded-lg border border-rose-700/50 transition-colors">
                  状況を更新
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Services Matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200">AIエージェント稼働状況</h2>
          </div>
          <button
            onClick={() => setActiveView('usage')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>利用枠・詳細分析</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AI_SERVICE_LIST.map((ai) => {
            const aiTasks = tasks.filter((t) => t.assignedAI === ai.id);
            const activeAiTasks = aiTasks.filter(
              (t) => t.status === '実行中' || t.status === '確認待ち'
            );

            // 該当する利用枠エントリ
            const usageEntry = aiUsage.entries.find((e) =>
              e.service.toLowerCase().includes(ai.name.toLowerCase().split(' ')[0])
            );

            return (
              <div
                key={ai.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: ai.color }}
                      ></span>
                      <span className="text-xs font-bold text-white">{ai.name}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {ai.executionEnv}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3 line-clamp-1">{ai.notes}</p>

                  <div className="flex items-center gap-2 text-xs mb-3">
                    <span className="text-slate-400">割当タスク:</span>
                    <span className="font-semibold text-slate-200">{aiTasks.length}件</span>
                    {activeAiTasks.length > 0 && (
                      <span className="text-indigo-400 font-medium">
                        (進行中 {activeAiTasks.length}件)
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {usageEntry?.reset_at_jst ? `リセット: ${usageEntry.reset_at_jst}` : '枠消費なし'}
                  </div>
                  <a
                    href={ai.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>開く</span>
                    <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-200">直近のタスク一覧</h2>
          </div>
          <button
            onClick={() => setActiveView('tasks')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            <span>すべて見る</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-800/80">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              onClick={() => {
                setSelectedTask(task);
                setIsDetailModalOpen(true);
              }}
              className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 px-2 rounded-lg transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-400">{task.id}</span>
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {task.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>{task.project}</span>
                  <span>担当: {AI_SERVICES[task.assignedAI].name}</span>
                  <span className="hidden sm:inline">更新: {task.updatedAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                    task.status === '実行中'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : task.status === '確認待ち'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : task.status === '完了'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-700/50 text-slate-300 border-slate-600'
                  }`}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
