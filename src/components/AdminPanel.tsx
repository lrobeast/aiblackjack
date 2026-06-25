import React, { useState, useEffect } from "react";
import { Shield, Lock, Unlock, X, User, LogOut, Home, RefreshCw, Search, Users, CreditCard, ChevronRight, AlertCircle, Coins } from "lucide-react";
import { playSound } from "./AudioController";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
}

export default function AdminPanel({ isOpen, onClose, apiFetch }: AdminPanelProps) {
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem("blackjack_admin_unlocked") === "true";
  });
  const [adminCode, setAdminCode] = useState<string>(() => {
    return localStorage.getItem("blackjack_admin_code") || "";
  });
  const [inputCode, setInputCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  // Data state
  const [adminState, setAdminState] = useState<{
    users: Array<{ id: string; username: string; balance: number; forceLobby?: boolean; forceLogout?: boolean }>;
    tables: Array<{
      id: string;
      name: string;
      status: string;
      seats: Array<{ seatIndex: number; userId: string | null; username: string | null; bet: number; status: string }>;
    }>;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [customBalances, setCustomBalances] = useState<Record<string, string>>({});
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Fetch admin state once unlocked
  useEffect(() => {
    if (!isAdminUnlocked || !isOpen) return;

    const fetchAdminState = async () => {
      try {
        const data = await apiFetch("/api/admin/state", {
          headers: {
            "x-admin-code": adminCode,
          },
        });
        setAdminState(data);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching admin state:", err);
        setError("Impossible de charger les données d'administration.");
        // If auth failed, lock admin
        if (err.message?.includes("refusé") || err.message?.includes("403")) {
          handleLock();
        }
      }
    };

    fetchAdminState();
    const interval = setInterval(fetchAdminState, 3000); // Poll admin state every 3s
    return () => clearInterval(interval);
  }, [isAdminUnlocked, isOpen, refreshTrigger, adminCode, apiFetch]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch("/api/admin/verify", {
        method: "POST",
        body: JSON.stringify({ code: inputCode }),
      });

      if (data && data.success) {
        playSound("click");
        setIsAdminUnlocked(true);
        setAdminCode(inputCode);
        localStorage.setItem("blackjack_admin_unlocked", "true");
        localStorage.setItem("blackjack_admin_code", inputCode);
        setInputCode("");
      } else {
        setError("Code incorrect.");
        playSound("lose");
      }
    } catch (err: any) {
      setError(err.message || "Code incorrect ou accès refusé.");
      playSound("lose");
    } finally {
      setLoading(false);
    }
  };

  const handleLock = () => {
    playSound("click");
    setIsAdminUnlocked(false);
    setAdminCode("");
    setAdminState(null);
    localStorage.removeItem("blackjack_admin_unlocked");
    localStorage.removeItem("blackjack_admin_code");
  };

  const handleAction = async (targetUserId: string, action: "kick" | "logout" | "reset-balance", amount?: number) => {
    playSound("click");
    try {
      const data = await apiFetch("/api/admin/action", {
        method: "POST",
        headers: {
          "x-admin-code": adminCode,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, targetUserId, amount }),
      });
      
      if (data.success) {
        setRefreshTrigger(prev => prev + 1);
        // Clean input for balance
        if (action === "reset-balance") {
          setCustomBalances(prev => ({ ...prev, [targetUserId]: "" }));
        }
      }
    } catch (err: any) {
      setError(err.message || "L'action d'administration a échoué.");
    }
  };

  const filteredUsers = adminState?.users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div id="admin-panel-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Panneau d'Administration
                {isAdminUnlocked && (
                  <span className="text-[10px] bg-red-950 border border-red-800 text-red-300 font-mono font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                    Déverrouillé
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">Gestion des joueurs et des soldes</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification / Error banner */}
        {error && (
          <div className="bg-red-950/50 border-b border-red-900/50 px-6 py-2 flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAdminUnlocked ? (
            /* Lock screen form */
            <div className="max-w-md mx-auto py-12 text-center space-y-6">
              <div className="w-16 h-16 bg-slate-850 border border-slate-700 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Saisir le Code Administrateur</h3>
                <p className="text-xs text-slate-400">Veuillez entrer le code secret pour accéder aux commandes du casino.</p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <input
                  type="password"
                  placeholder="Code secret (ex: roti)"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full text-center px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 font-mono tracking-widest text-lg"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 text-white font-bold rounded-xl shadow-lg shadow-red-900/30 transition hover:scale-[1.01] cursor-pointer text-sm"
                >
                  {loading ? "Vérification..." : "Déverrouiller le Mode Admin"}
                </button>
              </form>
            </div>
          ) : (
            /* Admin controls dashboard */
            <div className="space-y-8 animate-fade-in">
              
              {/* Stats overview / Lock state */}
              <div className="flex justify-between items-center bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Joueurs Enregistrés: <strong className="text-white font-mono">{adminState?.users.length || 0}</strong></span>
                  </div>
                  <div className="h-4 w-px bg-slate-800" />
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Total des tables: <strong className="text-white font-mono">{adminState?.tables.length || 0}</strong></span>
                  </div>
                </div>
                <button
                  onClick={handleLock}
                  className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition border border-red-900/50 rounded-lg px-3 py-1.5 bg-red-950/10 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Verrouiller
                </button>
              </div>

              {/* Grid: Left - Tables & Active players, Right - All Users directory */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Tables & Seats Section (LHS) */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                    <span>Tables Actives & Joueurs</span>
                  </h3>

                  {adminState?.tables.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs">
                      Aucune table disponible.
                    </div>
                  ) : (
                    adminState?.tables.map((table) => {
                      const seatedPlayers = table.seats.filter(s => s.userId !== null);
                      return (
                        <div key={table.id} className="bg-slate-950/30 border border-slate-850 rounded-xl overflow-hidden shadow-md">
                          {/* Table Header */}
                          <div className="bg-slate-950/60 px-4 py-3 border-b border-slate-850 flex justify-between items-center">
                            <div>
                              <span className="text-sm font-bold text-white block">{table.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">ID: {table.id} • Statut: {table.status}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold font-mono">
                              {seatedPlayers.length} / {table.seats.length} Joueurs
                            </span>
                          </div>

                          {/* Seated players details */}
                          <div className="p-3 divide-y divide-slate-850">
                            {seatedPlayers.length === 0 ? (
                              <div className="text-center py-4 text-xs text-slate-500 font-medium italic">
                                Aucun joueur assis à cette table.
                              </div>
                            ) : (
                              table.seats.map((seat) => {
                                if (!seat.userId) return null;
                                return (
                                  <div key={seat.seatIndex} className="py-2.5 flex justify-between items-center text-xs">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center font-mono shadow-inner">
                                        S{seat.seatIndex + 1}
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-200 block">{seat.username}</span>
                                        <span className="text-[9px] text-slate-500 font-mono block">Mise: <strong className="text-emerald-400 font-bold">${seat.bet}</strong> • {seat.status}</span>
                                      </div>
                                    </div>

                                    {/* Action buttons inside table seat */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleAction(seat.userId!, "kick")}
                                        className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-white bg-red-950/30 hover:bg-red-600/30 border border-red-500/20 hover:border-red-500/50 py-1 px-2.5 rounded transition cursor-pointer"
                                        title="Renvoyer ce joueur à la sélection des tables (Lobby)"
                                      >
                                        <Home className="w-3 h-3" />
                                        Kick Lobby
                                      </button>
                                      <button
                                        onClick={() => handleAction(seat.userId!, "logout")}
                                        className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-white bg-red-950/30 hover:bg-red-800 border border-red-500/20 hover:border-red-500 py-1 px-2.5 rounded transition cursor-pointer"
                                        title="Déconnecter de force ce joueur de l'application"
                                      >
                                        <LogOut className="w-3 h-3" />
                                        Logout
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Users list & Solde Management (RHS) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
                      Annuaire des Joueurs
                    </h3>
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">
                      {filteredUsers.length} affichés
                    </span>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Rechercher un joueur par nom..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-950 border border-slate-850 text-white placeholder-slate-600 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700 focus:border-slate-700"
                    />
                  </div>

                  {/* Users Directory List */}
                  <div className="bg-slate-950/20 border border-slate-850 rounded-xl max-h-[360px] overflow-y-auto divide-y divide-slate-850 p-1">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 italic">
                        Aucun utilisateur trouvé.
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSeated = adminState?.tables.some(t => t.seats.some(s => s.userId === u.id));
                        const balanceInput = customBalances[u.id] || "";

                        return (
                          <div key={u.id} className="p-3 text-xs flex flex-col space-y-2.5 hover:bg-slate-950/40 rounded-lg transition">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-bold text-slate-200">{u.username}</span>
                                  {isSeated && (
                                    <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1 rounded border border-indigo-900/60">
                                      En jeu
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">ID: {u.id}</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-lg shadow-inner">
                                ${u.balance}
                              </span>
                            </div>

                            {/* Solde Reset / Custom controls */}
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500 font-mono">Modif. Solde:</span>
                                <button
                                  onClick={() => handleAction(u.id, "reset-balance", 1000)}
                                  className="text-[9px] font-bold text-amber-300 hover:text-white bg-amber-950/40 hover:bg-amber-600/30 border border-amber-500/20 hover:border-amber-500/50 py-0.5 px-2 rounded-md transition cursor-pointer flex items-center gap-1"
                                  title="Réinitialiser le solde de ce joueur à $1000"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  $1K
                                </button>
                                
                                {/* Custom balance setter form inside card */}
                                <div className="flex items-center gap-1 flex-1">
                                  <input
                                    type="number"
                                    placeholder="Montant"
                                    value={balanceInput}
                                    onChange={(e) => setCustomBalances(prev => ({ ...prev, [u.id]: e.target.value }))}
                                    className="w-16 text-[10px] px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-white placeholder-slate-700 rounded-md focus:outline-none font-mono"
                                  />
                                  <button
                                    onClick={() => {
                                      const amount = parseFloat(balanceInput);
                                      if (!isNaN(amount) && amount >= 0) {
                                        handleAction(u.id, "reset-balance", amount);
                                      }
                                    }}
                                    disabled={!balanceInput}
                                    className="text-[9px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 py-0.5 px-1.5 rounded-md transition cursor-pointer"
                                  >
                                    Ok
                                  </button>
                                </div>
                              </div>

                              {/* Direct player eviction buttons if NOT seated at table but still active */}
                              {!isSeated && (
                                <div className="flex gap-1.5 mt-1">
                                  <button
                                    onClick={() => handleAction(u.id, "logout")}
                                    className="w-full text-center text-[9px] font-bold text-red-400 hover:text-white bg-red-950/20 hover:bg-red-900 border border-red-900/40 py-1 rounded transition cursor-pointer"
                                    title="Déconnecter ce joueur"
                                  >
                                    Exclure l'utilisateur
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/30 flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>CODENAME: BLACKJACK CASINO CONTROL</span>
          <span>CODE SECRET ACTIVE: ROTI</span>
        </div>

      </div>
    </div>
  );
}
