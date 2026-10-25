import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  ListTodo,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { AI_SERVICE_LIST, AI_SERVICES } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';
import { AIServiceId, Task, TaskStatus } from '../../types';

export const TaskListView: React.FC = () => {
  const {
    tasks,
    selectedProject,
    setSelectedProject,
    projects,
    setSelectedTask,
    setIsDetailModalOpen,
    setIsCreateModalOpen,
    isTaskStale,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [aiFilter, setAiFilter] = useState<string>('all');
  const [onlyStale, setOnlyStale] = useState(false);

  const STATUS_LIST: TaskStatus[] = [
    '未着手',
    '指示準備中',
    '実行待ち',
    '実行中',
    '確認待ち',
    '完了',
    '保留',
    'エラー',
  ];

  // フィルタリング処理
  const filteredTasks = tasks.filter((task) => {
    // プロジェクトフィルタ
    if (selectedProject !== 'all' && task.project !== selectedProject) {
      return false;
    }
    // ステータスフィルタ
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    // AI担当フィルタ
    if (aiFilter !== 'all' && task.assignedAI !== aiFilter) {
      return false;
    }
    // 停滞タスクのみ
    if (onlyStale && !isTaskStale(task)) {
      return false;
    }
    // 検索クエリ
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchId = task.id.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchId) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-16 md:pb-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-indigo-400" />
            <span>タスク一元管理</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            すべてのAIエージェントへの依頼・ステータス・進捗状況をリアルタイムに統合管理。
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新規タスク起票</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        {/* Top search & quick toggles */}
        <div className="flex flex-col md:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="タスクID、タイトル、内容で検索..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Stale Filter Toggle */}
          <button
            onClick={() => setOnlyStale(!onlyStale)}
            className={`w-full md:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              onlyStale
                ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>更新なし・停滞のみ絞り込み</span>
          </button>
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              プロジェクト
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">すべて表示</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">すべて表示</option>
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              担当AIエージェント
            </label>
            <select
              value={aiFilter}
              onChange={(e) => setAiFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">すべて表示</option>
              {AI_SERVICE_LIST.map((ai) => (
                <option key={ai.id} value={ai.id}>
                  {ai.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List Table / Cards */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
            条件に一致するタスクは見つかりませんでした。
          </div>
        ) : (
          filteredTasks.map((task) => {
            const ai = AI_SERVICES[task.assignedAI];
            const stale = isTaskStale(task);

            return (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  setIsDetailModalOpen(true);
                }}
                className={`bg-slate-900/90 border rounded-2xl p-4 transition-all cursor-pointer hover:border-slate-600 ${
                  stale
                    ? 'border-rose-700/60 bg-rose-950/20'
                    : 'border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {task.id}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{task.project}</span>
                    {stale && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold animate-pulse">
                        ⚠️ 2時間以上更新なし
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Confirmation badge */}
                    {task.isStatusConfirmed ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        ● 状態確認済み
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                        ▲ 状態未確認（手動要確認）
                      </span>
                    )}

                    {/* Status pill */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                        task.status === '実行中'
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : task.status === '確認待ち'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : task.status === '完了'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : task.status === 'エラー'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Title and Description */}
                <h3 className="text-sm font-bold text-white mb-1 leading-snug">{task.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                  {task.description}
                </p>

                {/* Footer Meta */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: ai.color }}
                      ></span>
                      <span className="font-semibold text-slate-200">{ai.name}</span>
                      <span className="text-slate-400 text-[10px]">({task.modelName})</span>
                    </div>

                    {task.artifacts.length > 0 && (
                      <span className="text-indigo-400 font-medium">
                        成果物 {task.artifacts.length}件
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span>最終更新: {task.updatedAt}</span>
                    <span>・</span>
                    <span>更新元: {task.updatedBy}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
