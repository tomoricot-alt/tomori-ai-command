import React, { useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  FolderGit2,
  History,
  Link as LinkIcon,
  Plus,
  Save,
  Share2,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { AI_SERVICE_LIST, AI_SERVICES } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';
import { AIServiceId, Task, TaskArtifact, TaskStatus } from '../../types';

export const TaskDetailModal: React.FC = () => {
  const {
    selectedTask,
    isDetailModalOpen,
    setIsDetailModalOpen,
    updateTask,
    deleteTask,
    copyPromptToClipboard,
    projects,
  } = useApp();

  if (!isDetailModalOpen || !selectedTask) return null;

  const [taskData, setTaskData] = useState<Task>({ ...selectedTask });
  const [activeTab, setActiveTab] = useState<'prompt' | 'result' | 'artifacts' | 'history'>('prompt');
  const [isCopied, setIsCopied] = useState(false);
  const [newArtifactTitle, setNewArtifactTitle] = useState('');
  const [newArtifactUrl, setNewArtifactUrl] = useState('');
  const [newArtifactType, setNewArtifactType] = useState<TaskArtifact['type']>('pr');

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

  const handleSave = () => {
    updateTask(taskData);
  };

  const handleCopyPrompt = async () => {
    const ok = await copyPromptToClipboard(taskData.instructionPrompt);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleAddArtifact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtifactTitle || !newArtifactUrl) return;

    const newArt: TaskArtifact = {
      id: `art-${Date.now()}`,
      title: newArtifactTitle,
      url: newArtifactUrl,
      type: newArtifactType,
    };

    const updated = {
      ...taskData,
      artifacts: [...taskData.artifacts, newArt],
      history: [
        {
          id: `h-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ja-JP'),
          actor: 'User',
          action: `成果物追加: ${newArtifactTitle}`,
        },
        ...taskData.history,
      ],
    };

    setTaskData(updated);
    updateTask(updated);
    setNewArtifactTitle('');
    setNewArtifactUrl('');
  };

  const handleDeleteArtifact = (artId: string) => {
    const updated = {
      ...taskData,
      artifacts: taskData.artifacts.filter((a) => a.id !== artId),
    };
    setTaskData(updated);
    updateTask(updated);
  };

  const ai = AI_SERVICES[taskData.assignedAI];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-slate-800 text-indigo-400 font-bold border border-slate-700">
              {taskData.id}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ai.color }}
              ></span>
              <span className="text-xs font-semibold text-slate-200">{ai.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>保存</span>
            </button>
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                タスク名
              </label>
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                依頼概要
              </label>
              <textarea
                rows={2}
                value={taskData.description}
                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Status & Assignment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            {/* Status select */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                ステータス
              </label>
              <select
                value={taskData.status}
                onChange={(e) => setTaskData({ ...taskData, status: e.target.value as TaskStatus })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Agent select */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                担当AIエージェント
              </label>
              <select
                value={taskData.assignedAI}
                onChange={(e) =>
                  setTaskData({ ...taskData, assignedAI: e.target.value as AIServiceId })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {AI_SERVICE_LIST.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Project select */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                プロジェクト
              </label>
              <select
                value={taskData.project}
                onChange={(e) => setTaskData({ ...taskData, project: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Confirmation Flag */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isStatusConfirmed"
                checked={taskData.isStatusConfirmed}
                onChange={(e) =>
                  setTaskData({
                    ...taskData,
                    isStatusConfirmed: e.target.checked,
                    lastConfirmedAt: e.target.checked ? '確認済み' : '状態未確認',
                  })
                }
                className="w-4 h-4 rounded text-indigo-600 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
              />
              <label
                htmlFor="isStatusConfirmed"
                className="text-xs font-semibold text-slate-200 cursor-pointer"
              >
                進捗ステータス確認済み（未確認の場合はチェックを外して手動確認待ちにする）
              </label>
            </div>

            <div className="text-[11px] text-slate-400">
              最終確認: <span className="text-slate-200">{taskData.lastConfirmedAt}</span>
            </div>
          </div>

          {/* AI Quick Actions Bar */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-200">
                担当AI: {ai.name} ({ai.executionEnv})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'コピー済' : '指示書コピー'}</span>
              </button>

              <a
                href={ai.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
              >
                <span>{ai.name}を開く</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-800 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'prompt'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              引き継ぎ指示書 (9大項目)
            </button>
            <button
              onClick={() => setActiveTab('result')}
              className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'result'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              作業結果 & 次のアクション
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'artifacts'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              成果物・リンク ({taskData.artifacts.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              履歴タイムライン
            </button>
          </div>

          {/* Tab 1: Instruction Prompt */}
          {activeTab === 'prompt' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>AIへ引き継ぐ指示書テキスト（編集可能）</span>
                <span>全9項目標準フォーマット</span>
              </div>
              <textarea
                rows={11}
                value={taskData.instructionPrompt}
                onChange={(e) =>
                  setTaskData({ ...taskData, instructionPrompt: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-y"
              />
            </div>
          )}

          {/* Tab 2: Result & Next Actions */}
          {activeTab === 'result' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  作業結果・進捗サマリー
                </label>
                <textarea
                  rows={4}
                  value={taskData.resultSummary || ''}
                  onChange={(e) =>
                    setTaskData({ ...taskData, resultSummary: e.target.value })
                  }
                  placeholder="AIの作業結果や完了した内容を貼り付けて記録します..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  次のアクション / 引き継ぎメモ
                </label>
                <textarea
                  rows={3}
                  value={taskData.nextActions || ''}
                  onChange={(e) =>
                    setTaskData({ ...taskData, nextActions: e.target.value })
                  }
                  placeholder="次に行う作業や、別のAIへ引き継ぐ内容を記録します..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Artifacts */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              {/* Existing Artifacts */}
              <div className="space-y-2">
                {taskData.artifacts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    成果物・URLはまだ登録されていません
                  </div>
                ) : (
                  taskData.artifacts.map((art) => (
                    <div
                      key={art.id}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                          {art.type}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{art.title}</div>
                          <a
                            href={art.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-indigo-400 hover:underline truncate block"
                          >
                            {art.url}
                          </a>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteArtifact(art.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Artifact Form */}
              <form onSubmit={handleAddArtifact} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300">成果物リンクの追加</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={newArtifactType}
                    onChange={(e) => setNewArtifactType(e.target.value as TaskArtifact['type'])}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="pr">GitHub PR</option>
                    <option value="preview">Cloudflare Preview</option>
                    <option value="doc">ドキュメント / スプレッドシート</option>
                    <option value="code">ソースコード / Commit</option>
                    <option value="other">その他URL</option>
                  </select>

                  <input
                    type="text"
                    value={newArtifactTitle}
                    onChange={(e) => setNewArtifactTitle(e.target.value)}
                    placeholder="タイトル (例: PR #12)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />

                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newArtifactUrl}
                      onChange={(e) => setNewArtifactUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      追加
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tab 4: History Timeline */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {taskData.history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800"
                >
                  <History className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{h.action}</span>
                      <span className="text-[10px] text-slate-400">{h.timestamp}</span>
                    </div>
                    {h.detail && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{h.detail}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">実行者: {h.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.confirm('このタスクを削除してもよろしいですか？')) {
                deleteTask(taskData.id);
              }
            }}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>タスクを削除</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
            >
              閉じる
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              変更を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
