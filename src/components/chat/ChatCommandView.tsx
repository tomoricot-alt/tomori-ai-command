import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  ExternalLink,
  Info,
  Layers,
  MessageSquareCode,
  Send,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';
import { AI_SERVICE_LIST, AI_SERVICES } from '../../constants/aiConfig';
import { INITIAL_PROJECTS } from '../../constants/projects';
import { useApp } from '../../context/AppContext';
import { PromptGeneratorService } from '../../services/promptGenerator';
import { RouteRecommendation, RouterService } from '../../services/router';
import { AIServiceId } from '../../types';

export const ChatCommandView: React.FC = () => {
  const { createTask, copyPromptToClipboard, showToast, setActiveView, setSelectedTask, setIsDetailModalOpen } =
    useApp();

  const [inputPrompt, setInputPrompt] = useState('');
  const [analysis, setAnalysis] = useState<RouteRecommendation | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [selectedAI, setSelectedAI] = useState<AIServiceId>('claude-code');
  const [selectedProject, setSelectedProject] = useState<string>('スターターズコネクト');
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // 指示文の解析・ドラフト生成
  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPrompt.trim()) return;

    const res = RouterService.analyzeRequest(inputPrompt);
    setAnalysis(res);
    setSelectedAI(res.recommendedAI);
    setSelectedProject(res.detectedProject);

    // タイトル生成（1行目または20字程度）
    const lines = inputPrompt.trim().split('\n');
    const title = lines[0].length > 40 ? lines[0].slice(0, 40) + '...' : lines[0];
    setTaskTitle(title);

    // 9大項目指示書のドラフト生成
    const draft = PromptGeneratorService.generateHandoffPrompt({
      project: res.detectedProject,
      title: title,
      description: inputPrompt,
      assignedAI: res.recommendedAI,
    });
    setGeneratedPrompt(draft);
  };

  // 担当AIを変更したときのプロンプト再生成
  const handleAiChange = (newAi: AIServiceId) => {
    setSelectedAI(newAi);
    if (analysis && taskTitle) {
      const draft = PromptGeneratorService.generateHandoffPrompt({
        project: selectedProject,
        title: taskTitle,
        description: inputPrompt,
        assignedAI: newAi,
      });
      setGeneratedPrompt(draft);
    }
  };

  // クリップボードへコピー
  const handleCopy = async () => {
    if (!generatedPrompt) return;
    const ok = await copyPromptToClipboard(generatedPrompt);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // タスクへ登録して完了
  const handleRegisterTask = () => {
    if (!taskTitle || !generatedPrompt) return;

    const newTask = createTask({
      title: taskTitle,
      description: inputPrompt,
      project: selectedProject,
      assignedAI: selectedAI,
      instructionPrompt: generatedPrompt,
    });

    // 登録後、タスク詳細を開くかタスク一覧へ遷移
    setSelectedTask(newTask);
    setIsDetailModalOpen(true);
    setActiveView('tasks');
  };

  // サンプルプロンプト投入
  const loadExample = (text: string) => {
    setInputPrompt(text);
  };

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <MessageSquareCode className="w-5 h-5 text-indigo-400" />
            <span>AIチャット指令 & 引き継ぎ作成</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            仕事の内容を自然言語で入力すると、担当AIの推薦と9項目の正式引き継ぎ指示書を自動生成します。
          </p>
        </div>
      </div>

      {/* Preset example prompt pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-[11px] whitespace-nowrap">入力例:</span>
        <button
          onClick={() =>
            loadExample(
              'スターターズコネクトのホームページのお問い合わせフォームにバリデーションを追加して'
            )
          }
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
        >
          💡 スターターズコネクトのHP修正
        </button>
        <button
          onClick={() =>
            loadExample(
              'この修正はCodexで進めたい。tomori-ai-commandのPWAマニフェストを設定して'
            )
          }
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
        >
          💡 CodexでPWAマニフェスト設定
        </button>
        <button
          onClick={() =>
            loadExample(
              '補助金ポータルの顧客面談議事録から申請要件を抽出してサマリーを作って'
            )
          }
          className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors cursor-pointer"
        >
          💡 補助金ポータルの面談要約
        </button>
      </div>

      {/* Prompt Input Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <form onSubmit={handleAnalyze} className="space-y-3">
          <div className="relative">
            <textarea
              rows={4}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="例: スターターズコネクトのお問い合わせフォームに電話番号ハイフン自動挿入を追加したい。この内容をClaude Codeへ渡して。"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3.5 text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>「Claude Codeに渡して」「Codexで」「Workで」等のキーワードも自動識別</span>
            </div>

            <button
              type="submit"
              disabled={!inputPrompt.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>AI担当判定 & 指示書生成</span>
            </button>
          </div>
        </form>
      </div>

      {/* Generated Analysis & Handoff Prompt Preview */}
      {analysis && (
        <div className="space-y-4 animate-fade-in">
          {/* Recommendation Banner */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow"
                  style={{ backgroundColor: AI_SERVICES[selectedAI].color }}
                >
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">推薦AI担当:</span>
                    <span className="text-sm font-bold text-white">
                      {AI_SERVICES[selectedAI].name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {analysis.category}
                    </span>
                  </div>
                  <div className="text-xs text-indigo-300/90 mt-0.5">
                    判定理由: {analysis.reason}
                  </div>
                </div>
              </div>

              {/* Status flag regarding direct send */}
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  クリップボード引き継ぎモード (API直送はPhase 3予定)
                </span>
              </div>
            </div>

            {/* Overwrite controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  担当AIの変更（任意で切り替え可能）
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {AI_SERVICE_LIST.map((ai) => (
                    <button
                      key={ai.id}
                      type="button"
                      onClick={() => handleAiChange(ai.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer truncate ${
                        selectedAI === ai.id
                          ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ai.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  対象プロジェクト
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {INITIAL_PROJECTS.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} ({p.business})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Structured Prompt Editor */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  生成された引き継ぎ指示書（9項目標準仕様）
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'コピー完了！' : 'ワンタップコピー'}</span>
                </button>

                <a
                  href={AI_SERVICES[selectedAI].webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <span>{AI_SERVICES[selectedAI].name}を開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Prompt textarea (editable) */}
            <textarea
              rows={12}
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors resize-y"
            />

            {/* Submit to Task Management */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                「タスクへ登録」を押すと、統合ダッシュボードで進捗管理を開始できます。
              </div>

              <button
                type="button"
                onClick={handleRegisterTask}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                <span>タスクへ登録して管理を開始</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
