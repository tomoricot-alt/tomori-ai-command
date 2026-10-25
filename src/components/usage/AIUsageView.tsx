import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  HelpCircle,
  Info,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AIUsageEntry } from '../../types';

export const AIUsageView: React.FC = () => {
  const { aiUsage, refreshUsage } = useApp();

  // サービスごとにグループ化
  const serviceGroups = aiUsage.entries.reduce((acc, entry) => {
    if (!acc[entry.service]) {
      acc[entry.service] = [];
    }
    acc[entry.service].push(entry);
    return acc;
  }, {} as Record<string, AIUsageEntry[]>);

  return (
    <div className="space-y-5 pb-16 md:pb-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>AI別利用状況 & リセット枠モニタ</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            各AIの契約プラン、残り枠、リセットタイミング、確定可否を厳格に可視化。
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            実測取得: <span className="text-indigo-300 font-mono">{aiUsage.generated_at_jst}</span>
          </div>

          <button
            onClick={refreshUsage}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>最新データ読込</span>
          </button>
        </div>
      </div>

      {/* Safety Policy Notice regarding Accurate Metrics */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-indigo-300 font-bold">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>TOMORI AI運用ポリシー：推測値確定表示の禁止と正確性の担保</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          本システムでは、非公式スクレイピングや推測による不確実な数値の断定を行いません。
          `AI_COMMON/tools/ai_usage_check`
          により公式設定ページから確認された数値のみを表示し、専用メーターのない項目（ChatGPT通常Chat会話等）は「確定不可 / 表示なし」と明記します。
        </p>
      </div>

      {/* Service Cards */}
      <div className="space-y-4">
        {Object.entries(serviceGroups).map(([serviceName, entries]) => {
          const firstEntry = entries[0];
          const hasWarning = entries.some((e) => e.status === 'warning' || (e.used_percent !== null && e.used_percent > 80));

          return (
            <div
              key={serviceName}
              className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${
                hasWarning ? 'border-amber-700/60' : 'border-slate-800'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs border border-slate-700">
                    {serviceName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">{serviceName}</h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {firstEntry?.plan || 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>

                <a
                  href={firstEntry?.source_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>公式利用状況ページを開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Sub-Scopes Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {entries.map((entry, idx) => {
                  const isWarning =
                    entry.status === 'warning' ||
                    (entry.used_percent !== null && entry.used_percent > 85) ||
                    entry.remaining_percent === 0;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                        entry.measured === 'none'
                          ? 'bg-slate-950/40 border-slate-800/60'
                          : isWarning
                          ? 'bg-amber-950/20 border-amber-800/50'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div>
                        {/* Scope Title & Badge */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-200">{entry.scope}</span>
                          {entry.measured === 'none' ? (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                              専用残量なし
                            </span>
                          ) : entry.measured === 'credit' ? (
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                              クレジット課金枠
                            </span>
                          ) : entry.measured === 'share' ? (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                              消費比率
                            </span>
                          ) : (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                                isWarning
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {entry.remaining_percent !== null
                                ? `残量 ${entry.remaining_percent}%`
                                : `使用率 ${entry.used_percent}%`}
                            </span>
                          )}
                        </div>

                        {/* Metric Bar / Values */}
                        {entry.remaining_percent !== null && (
                          <div className="space-y-1 my-2">
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  entry.remaining_percent === 0
                                    ? 'bg-rose-500'
                                    : entry.remaining_percent < 20
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${entry.remaining_percent}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>残り: {entry.remaining_percent}%</span>
                              <span>リセット: {entry.reset_at_jst || '随時'}</span>
                            </div>
                          </div>
                        )}

                        {entry.used_percent !== null && (
                          <div className="space-y-1 my-2">
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  entry.used_percent > 85
                                    ? 'bg-amber-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${entry.used_percent}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>使用済: {entry.used_percent}%</span>
                              <span>リセット: {entry.reset_at_jst || '週次更新'}</span>
                            </div>
                          </div>
                        )}

                        {/* Credit Text */}
                        {entry.credit_text && (
                          <div className="my-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-indigo-300">
                            {entry.credit_text}
                          </div>
                        )}

                        {/* Notes */}
                        {entry.note && (
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            {entry.note}
                          </p>
                        )}
                      </div>

                      {/* Reset Timestamp */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span>
                          {entry.reset_at_jst ? `リセット予定: ${entry.reset_at_jst}` : '定常枠'}
                        </span>
                        <span className="text-slate-400">
                          取得: {entry.fetched_at_jst || '手動/公式リンク'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
