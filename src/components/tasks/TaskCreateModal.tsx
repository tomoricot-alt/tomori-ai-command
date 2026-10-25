import React, { useState } from 'react';
import { Bot, Plus, X } from 'lucide-react';
import { AI_SERVICE_LIST } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';
import { AIServiceId } from '../../types';

export const TaskCreateModal: React.FC = () => {
  const {
    isCreateModalOpen,
    setIsCreateModalOpen,
    projects,
    selectedProject,
    createTask,
    setSelectedTask,
    setIsDetailModalOpen,
  } = useApp();

  if (!isCreateModalOpen) return null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState(
    selectedProject !== 'all' ? selectedProject : projects[0]?.name || 'TOMORI AI COMMAND'
  );
  const [assignedAI, setAssignedAI] = useState<AIServiceId>('codex');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask = await createTask({
      title,
      description,
      project,
      assignedAI,
    });

    setIsCreateModalOpen(false);
    setSelectedTask(newTask);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">新規AIタスク起票</h2>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              タスクタイトル <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: スターターズコネクト ヘッダーナビゲーションの崩れ修正"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-indigo-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              依頼内容・作業詳細
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="作業の目的、具体的な修正内容、注意点などを入力します..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                対象プロジェクト
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                担当AIエージェント
              </label>
              <select
                value={assignedAI}
                onChange={(e) => setAssignedAI(e.target.value as AIServiceId)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {AI_SERVICE_LIST.map((ai) => (
                  <option key={ai.id} value={ai.id}>
                    {ai.name} ({ai.executionEnv})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              起票して詳細指示を開く
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
