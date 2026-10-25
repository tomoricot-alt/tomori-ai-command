import React, { useRef, useState } from 'react';
import {
  Cloud,
  Database,
  Download,
  KeyRound,
  Lock,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, exportData, importData, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staleHours, setStaleHours] = useState(settings.alertStaleHours);
  const [d1Endpoint, setD1Endpoint] = useState(settings.d1ApiEndpoint || '');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      alertStaleHours: staleHours,
      d1ApiEndpoint: d1Endpoint,
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
          <span>システム設定 & データ永続化</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          PCとiPhone間のデータ同期、Cloudflare D1接続設定、セキュリティとバックアップ。
        </p>
      </div>

      {/* Cloudflare D1 & Cloud Architecture Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex items-center gap-2.5 text-indigo-300 font-bold text-sm">
          <Cloud className="w-5 h-5 text-indigo-400" />
          <span>Cloudflare D1 / Workers クラウド同期アダプター</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          初期版では端末内の `localStorage`
          で完全ローカル動作し、不要なクラウド課金を一切発生させません。
          Cloudflare D1（無料枠）のエンドポイントを登録することで、PCとiPhone間の双方向自動同期へシームレスに拡張可能です。
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Cloudflare D1 API エンドポイント（任意）
            </label>
            <input
              type="text"
              value={d1Endpoint}
              onChange={(e) => setD1Endpoint(e.target.value)}
              placeholder="https://tomori-ai-command-api.workers.dev/sync"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ローカルストレージ永続化モード稼働中
            </span>
            <button
              type="submit"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>設定を保存</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup & Restore (PC / iPhone Migration) */}
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

      {/* Security & Access Protection Info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <KeyRound className="w-4 h-4 text-emerald-400" />
          <span>認証PINコード</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          現在の標準アクセスコードは <code className="text-indigo-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">2026</code> です。
          Cloudflare Pages公開時はCloudflare Access（ゼロトラスト認証）との併用を推奨します。
        </p>
      </div>
    </div>
  );
};
