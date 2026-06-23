import React from "react";
import { TableState, UserProfile } from "../types";
import { Users, Coins, HelpCircle, ArrowRight, RefreshCw, LogOut } from "lucide-react";
import { playSound } from "./AudioController";

interface TableSelectionProps {
  tables: any[];
  user: UserProfile;
  onSelectTable: (tableId: string) => void;
  onTopUp: () => void;
  onLogout: () => void;
}

export default function TableSelection({ tables, user, onSelectTable, onTopUp, onLogout }: TableSelectionProps) {
  const needsTopUp = user.balance < 50;

  return (
    <div id="lobby-container" className="relative min-h-screen bg-[#020617] text-slate-100 py-8 md:py-12 px-4 overflow-hidden font-sans">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Lobby Header */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-2xl mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold text-xl">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 tracking-tight">
                Bonjour, <span className="text-emerald-400">{user.username}</span>
              </h2>
              <p className="text-xs text-slate-400">Prêt à affronter le croupier ?</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="bg-white/10 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
              <Coins className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Votre Solde</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">${user.balance.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {needsTopUp && (
                <button
                  onClick={() => {
                    playSound("win");
                    onTopUp();
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recharger
                </button>
              )}

              <button
                onClick={() => {
                  playSound("click");
                  onLogout();
                }}
                title="Se déconnecter"
                className="p-2 border border-white/10 hover:border-red-500/40 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition duration-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-100 tracking-tight">
            🃏 SALLE DE <span className="text-emerald-400">BLACKJACK</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
            Sélectionnez une table de jeu, installez-vous à un siège libre et affrontez le croupier en temps réel avec d'autres joueurs !
          </p>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tables.map((table) => {
            // Determine styling based on stakes
            let accentColor = "from-white/5 to-white/0";
            let borderHighlight = "border-white/10 hover:border-emerald-500/50 hover:shadow-emerald-500/5";
            let badgeColor = "bg-white/10 text-slate-300 border border-white/10";
            let stakeLabel = "Standard";

            if (table.id === "table-2") {
              borderHighlight = "border-amber-500/20 hover:border-amber-500/50 hover:shadow-amber-500/5";
              badgeColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              stakeLabel = "Premium";
            } else if (table.id === "table-3") {
              borderHighlight = "border-purple-500/20 hover:border-purple-500/50 hover:shadow-purple-500/5";
              badgeColor = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
              stakeLabel = "High Roller";
            }

            const isFull = table.activePlayersCount >= 5;

            return (
              <div
                key={table.id}
                onClick={() => {
                  playSound("click");
                  onSelectTable(table.id);
                }}
                className={`group flex flex-col justify-between bg-gradient-to-b ${accentColor} backdrop-blur-md rounded-2xl border ${borderHighlight} p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${badgeColor}`}>
                      {stakeLabel}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{table.activePlayersCount}/5 Joueurs</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors mb-1">
                    {table.name}
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 font-mono">ID: {table.id}</p>

                  {/* Stakes specifications */}
                  <div className="space-y-2.5 border-t border-b border-white/5 py-4 mb-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Mise Minimum :</span>
                      <span className="font-bold text-slate-300 font-mono">${table.minBet}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Mise Maximum :</span>
                      <span className="font-bold text-emerald-400 font-mono">${table.maxBet}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">État de la table :</span>
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide">
                        {table.status === "waiting" && "En attente"}
                        {table.status === "betting" && "Mises ouvertes"}
                        {table.status === "dealing" && "Distribution"}
                        {table.status === "player-turns" && "En jeu"}
                        {table.status === "dealer-turn" && "Tour Croupier"}
                        {table.status === "round-over" && "Résultats"}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={isFull}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                    isFull
                      ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                      : "bg-white/10 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 border border-white/15 hover:border-transparent shadow-md hover:shadow-emerald-500/10 cursor-pointer"
                  }`}
                >
                  {isFull ? "Table Pleine" : "Rejoindre la Table"}
                  {!isFull && <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Guide Rules */}
        <div className="mt-12 bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-5 text-xs text-slate-400 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-300">Règles de prestige de notre Casino :</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Le Blackjack naturel paye <span className="text-emerald-400 font-semibold">3:2</span>.</li>
              <li>Le Croupier s'arrête obligatoirement à <span className="text-slate-300 font-semibold">17</span> ou plus.</li>
              <li>Vous pouvez <span className="text-slate-300 font-semibold">Doubler</span> votre mise sur vos deux premières cartes pour ne tirer qu'une seule carte finale.</li>
              <li>Si vous perdez tous vos jetons, un bouton de <span className="text-slate-300 font-semibold">Recharge</span> apparaîtra pour vous offrir un nouveau tapis de $1,000 !</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
