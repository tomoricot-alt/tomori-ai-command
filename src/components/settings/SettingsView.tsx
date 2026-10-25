import React, { useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Database,
  Download,
  KeyRound,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportData,
    importData,
    syncWithServer,
    syncStatus,
    isSampleMode,
    enableSampleMode,
    clearToProductionMode,
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staleHours, setStaleHours] = useState(settings.alertStaleHours);
  const [apiKey, setApiKey] = useState(settings.apiSecretKey || '');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      alertStaleHours: staleHours,
      apiSecretKey: apiKey,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importData(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6 max-w-4xl">
      {/* Header Info */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>システム設定 & クラウド同期</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          PC・iPhone間のデータ同期（Cloudflare D1）、セキュリティ認証、バックアップ。
        </p>
      </div>

      {/* Cloudflare D1 Sync Status & Mode Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-sm">
            <Cloud className="w-5 h-5 text-indigo-400" />
            <span>Cloudflare D1 クラウド永続同期（PC・iPhone共有）</span>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isSampleMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : syncStatus.online
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {isSampleMode ? 'サンプル/デモ表示中' : syncStatus.online ? 'D1同期有効' : 'オフライン'}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          タスクおよび成果物は、Cloudflare Workers + D1（無料枠）によりクラウド上で永続管理されます。
          PCまたはiPhoneのSafariで開いても同一の最新データがリアルタイムに参照・更新されます。
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => syncWithServer()}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>今すぐD1と強制再同期</span>
          </button>

          {isSampleMode ? (
            <button
              onClick={clearToProductionMode}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <span>本番D1モードへ切り替え</span>
            </button>
          ) : (
            <button
              onClick={enableSampleMode}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>サンプルデータで表示確認</span>
            </button>
          )}
        </div>
      </div>

      {/* Security & Access Protection Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm">
          <Shield className="w-5 h-5 text-emerald-400" />
          <span>サーバー側認証 & Cloudflare Access連携</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          安全性を担保するため、ブラウザ単独の簡易PIN判定を廃止し、Cloudflare Workers API側でのセッショントークン検証およびCloudflare Access（ゼロトラスト認証）に対応しています。
          認証されていない第三者にはタスクAPIや機密業務データが一切返却されません。
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              API シークレットキー（Workers環境変数 `API_SECRET_KEY` と照合）
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cloudflare API Secret Key"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>認証設定を保存</span>
          </button>
        </form>
      </div>

      {/* Backup & Restore (JSON Export / Import) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm">
          <Database className="w-5 h-5 text-indigo-400" />
          <span>データバックアップ & 端末間エクスポート</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          全タスク、AI利用状況、プロジェクト、履歴を単一のJSONファイルとして書き出します。PCで作成したタスクをiPhoneへインポートして引き継ぐことも可能です。
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>JSONバックアップを書き出し</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>JSONバックアップから復元</span>
          </button>
        </div>
      </div>

      {/* Stale Task Alert Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-white font-bold text-sm">
          <Shield className="w-5 h-5 text-amber-400" />
          <span>停滞タスク監視 & アラート基準</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              更新なしアラートを発火する経過時間（時間単位）
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={48}
                value={staleHours}
                onChange={(e) => setStaleHours(Number(e.target.value))}
                className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-400">
                時間以上進捗報告のない「進行中」タスクを自動で警告表示
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              updateSettings({ alertStaleHours: staleHours });
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>監視基準を保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
