import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthenticated, loginWithKey, enableSampleMode } = useApp();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showKey, setShowKey] = useState(false);

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError(false);
    const ok = await loginWithKey(key.trim());
    setLoading(false);
    if (!ok) {
      setError(true);
      setKey('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">TOMORI AI COMMAND</h2>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          業務データおよび機密保護のため、サーバー側認証が必要です。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-xs font-medium text-slate-300 mb-1.5">
              APIアクセストークン / 秘密鍵
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError(false);
                }}
                placeholder="Cloudflare API Secret Key"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-slate-500 hover:text-slate-300 absolute right-3.5 top-3.5 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-rose-400 text-[11px] mt-1.5 text-left">
                認証に失敗しました。Cloudflare側で設定したシークレットキーと一致しません。
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            {loading ? 'サーバー検証中...' : 'サーバー認証してロック解除'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="text-[11px] text-slate-400 leading-relaxed">
            ※ 本番環境では Cloudflare Access（Zero Trust）により自動認証されます。
          </div>

          {/* Sample / Demo Mode Button */}
          <button
            type="button"
            onClick={enableSampleMode}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-indigo-300 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>サンプル/デモデータでUIを確認する</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cloudflare Workers + D1 Protected</span>
        </div>
      </div>
    </div>
  );
};
