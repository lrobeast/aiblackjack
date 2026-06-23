import React, { useState } from "react";
import { playSound } from "./AudioController";
import { ShieldAlert, Coins, Sparkles } from "lucide-react";

interface LoginProps {
  onLoginSuccess: (username: string, pin: string) => Promise<void>;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("Le code PIN doit être composé d'exactement 4 chiffres.");
      return;
    }

    setLoading(true);
    playSound("click");

    try {
      await onLoginSuccess(cleanUsername, pin);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-screen" className="min-h-screen bg-[#020617] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden z-10">
        {/* Brand / Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 font-serif font-black text-3xl shadow-xl shadow-emerald-500/20 mb-4 animate-pulse">
            B
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            BLACKJACK <span className="text-emerald-400">MULTIPLAYER</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-widest font-sans font-bold flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Casino Virtuel de Prestige
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </p>
        </div>

        {/* Error panel */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="font-sans leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Pseudo (Identifiant)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: Lucas, Jean, VIP_Player"
              maxLength={16}
              disabled={loading}
              className="w-full bg-white/5 text-slate-100 rounded-xl px-4 py-3 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder-slate-500 transition font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Code PIN Secret (4 chiffres)
              </label>
              <span className="text-[9px] text-slate-500">Sert à protéger votre compte</span>
            </div>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 4) setPin(val);
              }}
              placeholder="••••"
              disabled={loading}
              className="w-full bg-white/5 text-slate-100 rounded-xl px-4 py-3 border border-white/10 text-center tracking-widest text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder-slate-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-extrabold text-sm py-3.5 rounded-xl transition duration-200 shadow-lg shadow-emerald-500/20 active:scale-98 flex justify-center items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Se Connecter / S'Inscrire"
            )}
          </button>
        </form>

        {/* Informational Footer */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-slate-500 text-[10px] tracking-wide font-medium">
            <Coins className="w-3.5 h-3.5 text-emerald-400/60" />
            <span>Chaque nouveau joueur reçoit un tapis gratuit de $1,000 !</span>
          </div>
        </div>
      </div>
    </div>
  );
}
