import React, { useState } from 'react';
import { Bot, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuthModal: React.FC = () => {
  const { isAuthenticated, login } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (isAuthenticated) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = login(pin);
    if (!ok) {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-white mb-1">TOMORI AI COMMAND</h2>
        <p className="text-xs text-slate-400 mb-6">
          業務データおよび機密保護のため、アクセス認証が必要です。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-left text-xs font-medium text-slate-300 mb-1.5">
              アクセスコード / PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="2026 または tomori"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg tracking-widest text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                autoFocus
              />
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
            {error && (
              <p className="text-rose-400 text-xs mt-1.5 text-left">
                アクセスコードが無効です（初期値: 2026）
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            認証してロック解除
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Cloudflare Workers / D1 Multi-tenant Ready</span>
        </div>
      </div>
    </div>
  );
};
