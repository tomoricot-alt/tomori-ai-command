import React, { useState } from 'react';
import {
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  Globe,
  Layers,
  Search,
} from 'lucide-react';
import { AI_SERVICES } from '../../constants/aiConfig';
import { useApp } from '../../context/AppContext';

export const ArtifactsView: React.FC = () => {
  const { tasks, setSelectedTask, setIsDetailModalOpen } = useApp();
  const [search, setSearch] = useState('');

  // 全タスクから成果物をフラットに抽出
  const allArtifacts = tasks.flatMap((t) =>
    t.artifacts.map((a) => ({
      ...a,
      task: t,
    }))
  );

  const filtered = allArtifacts.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      item.task.title.toLowerCase().includes(q) ||
      item.task.project.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-400" />
            <span>成果物 & PR一覧</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            各AIエージェントが作成したGitHub PR、Cloudflareプレビュー、成果物リンクの一元管理。
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="成果物タイトル、URL、タスク名、プロジェクト名で検索..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Artifacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
            登録された成果物はありません。タスク詳細画面から成果物URLを追加できます。
          </div>
        ) : (
          filtered.map((item) => {
            const ai = AI_SERVICES[item.task.assignedAI];
            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="uppercase text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.type}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedTask(item.task);
                        setIsDetailModalOpen(true);
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    >
                      {item.task.id}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                  <div className="text-xs text-slate-400 mb-3">
                    プロジェクト: <span className="text-slate-200">{item.task.project}</span>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-indigo-400 hover:text-indigo-300 hover:border-indigo-500/40 transition-colors break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.url}</span>
                  </a>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: ai.color }}
                    ></span>
                    <span>{ai.name}</span>
                  </div>
                  <span>更新: {item.task.updatedAt}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
