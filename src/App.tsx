import React, { useState, useEffect, useCallback } from "react";
import { UserProfile, TableState } from "./types";
import Login from "./components/Login";
import TableSelection from "./components/TableSelection";
import GameTable from "./components/GameTable";
import { playSound } from "./components/AudioController";
import { ShieldAlert, X, Shield } from "lucide-react";
import AdminPanel from "./components/AdminPanel";

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access blocked:", e);
      return (window as any)[`__fallback_storage_${key}`] || null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access blocked:", e);
      (window as any)[`__fallback_storage_${key}`] = value;
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access blocked:", e);
      delete (window as any)[`__fallback_storage_${key}`];
    }
  }
};

export default function App() {
  const [token, setToken] = useState<string | null>(safeLocalStorage.getItem("blackjack_token"));
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [activeTableState, setActiveTableState] = useState<TableState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Helper to show errors gracefully without blocking alerts
  const showError = (msg: string) => {
    playSound("lose");
    setErrorNotification(msg);
    setTimeout(() => {
      setErrorNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Helper: Request with Auth Header
  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const res = await fetch(url, { ...options, headers });
      let data: any;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        data = {};
      }

      // Check if this is an admin forced action from response
      const isForceLogout = data && (data.forceLogout || (data.user && data.user.forceLogout) || data.error === "FORCE_LOGOUT" || res.status === 401 && (data.error === "FORCE_LOGOUT" || data.forceLogout));
      const isForceLobby = data && (data.forceLobby || (data.user && data.user.forceLobby));

      if (isForceLogout) {
        showError("Vous avez été exclu et déconnecté par l'administrateur.");
        safeLocalStorage.removeItem("blackjack_token");
        setToken(null);
        setUser(null);
        setActiveTableId(null);
        setActiveTableState(null);
        throw new Error("Déconnecté par l'administrateur.");
      }

      if (isForceLobby) {
        showError("Vous avez été renvoyé à l'accueil par l'administrateur.");
        setActiveTableId(null);
        setActiveTableState(null);
      }

      if (!res.ok) {
        throw new Error(data.error || data.message || `Erreur serveur (${res.status})`);
      }
      return data;
    },
    [token]
  );

  // Authenticate user on load or token change
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch("/api/auth/me")
      .then((data) => {
        setUser(data);
      })
      .catch((err) => {
        console.info("Auth session expired:", err);
        safeLocalStorage.removeItem("blackjack_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, apiFetch]);

  // Fetch tables list periodically (Lobby Mode)
  useEffect(() => {
    if (!token || activeTableId) return;

    const fetchLobby = () => {
      apiFetch("/api/tables")
        .then((data) => setTablesList(data))
        .catch((err) => console.warn("Error fetching tables:", err));
    };

    fetchLobby();
    const interval = setInterval(fetchLobby, 2000); // 2 seconds poll in lobby
    return () => clearInterval(interval);
  }, [token, activeTableId, apiFetch]);

  // Fetch active table details periodically (Table Mode)
  useEffect(() => {
    if (!token || !activeTableId) {
      setActiveTableState(null);
      return;
    }

    const fetchTable = () => {
      apiFetch(`/api/tables/${activeTableId}`)
        .then((data) => {
          if (data && data.table && data.table.seats) {
            setActiveTableState(data.table);
            if (data.user) {
              setUser(data.user);
            }
          } else if (data && data.seats) {
            setActiveTableState(data);
          }
        })
        .catch((err) => {
          console.warn("Error fetching active table details:", err);
          setActiveTableId(null);
        });
    };

    fetchTable();
    const interval = setInterval(fetchTable, 1000); // 1 second fast poll at table
    return () => clearInterval(interval);
  }, [token, activeTableId, apiFetch]);

  // Handle Login and auto-registration
  const handleLoginSuccess = async (username: string, pin: string) => {
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, pin }),
      });
      safeLocalStorage.setItem("blackjack_token", data.token);
      setToken(data.token);
      setUser(data.user);
    } catch (err: any) {
      throw err;
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (activeTableId) {
      try {
        await apiFetch(`/api/tables/${activeTableId}/leave`, {
          method: "POST",
        });
      } catch (err) {
        console.warn("Error leaving table during logout:", err);
      }
    }
    safeLocalStorage.removeItem("blackjack_token");
    setToken(null);
    setUser(null);
    setActiveTableId(null);
    setActiveTableState(null);
  };

  // Handle Joining a Seat
  const handleJoinSeat = async (seatIndex: number) => {
    if (!activeTableId) return;
    try {
      const updatedTable = await apiFetch(`/api/tables/${activeTableId}/join`, {
        method: "POST",
        body: JSON.stringify({ seatIndex }),
      });
      setActiveTableState(updatedTable);
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle Leaving Table
  const handleLeaveTable = async () => {
    if (!activeTableId) return;
    try {
      await apiFetch(`/api/tables/${activeTableId}/leave`, {
        method: "POST",
      });
      setActiveTableId(null);
      setActiveTableState(null);
    } catch (err: any) {
      console.warn("Error leaving table:", err);
      setActiveTableId(null);
      setActiveTableState(null);
    }
  };

  // Handle Leaving Seat (Standing Up) but staying at the table as spectator
  const handleLeaveSeat = async () => {
    if (!activeTableId) return;
    try {
      const updatedTable = await apiFetch(`/api/tables/${activeTableId}/leave`, {
        method: "POST",
      });
      setActiveTableState(updatedTable);
    } catch (err: any) {
      console.warn("Error leaving seat:", err);
      showError(err.message);
    }
  };

  // Handle Placing Bets
  const handlePlaceBet = async (amount: number) => {
    if (!activeTableId) return;
    try {
      const data = await apiFetch(`/api/tables/${activeTableId}/bet`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      setActiveTableState(data.table);
      setUser(data.user);
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle Player Actions (Hit, Stand, Double)
  const handleSendAction = async (action: "hit" | "stand" | "double") => {
    if (!activeTableId) return;
    try {
      const data = await apiFetch(`/api/tables/${activeTableId}/action`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      setActiveTableState(data.table);
      setUser(data.user);
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Handle sending chat messages
  const handleSendMessage = async (text: string) => {
    if (!activeTableId) return;
    try {
      const updatedTable = await apiFetch(`/api/tables/${activeTableId}/chat`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setActiveTableState(updatedTable);
    } catch (err: any) {
      console.warn("Error sending message:", err);
    }
  };

  // Handle TopUp/Recharge request
  const handleTopUp = async () => {
    try {
      const updatedUser = await apiFetch("/api/auth/topup", {
        method: "POST",
      });
      setUser(updatedUser);
    } catch (err: any) {
      showError(err.message);
    }
  };

  // Rendering screen loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col justify-center items-center font-sans relative overflow-hidden">
        {/* Mesh Gradient Background Elements */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center font-serif text-emerald-400 font-black text-2xl animate-pulse">
              ♠
            </div>
          </div>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase animate-pulse">
            Chargement du Casino Virtuel...
          </p>
        </div>
      </div>
    );
  }

  // View Routing
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col relative font-sans selection:bg-emerald-500/35 selection:text-white">
      {/* Dynamic Glassmorphic Notification Banner */}
      {errorNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-bounce">
          <div className="bg-[#991b1b]/80 border border-red-500/30 backdrop-blur-xl text-red-100 px-4 py-3.5 rounded-2xl shadow-2xl flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <ShieldAlert className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="text-xs">
                <span className="font-bold block text-red-200">Alerte Secrétariat</span>
                <span className="mt-0.5 leading-relaxed block">{errorNotification}</span>
              </div>
            </div>
            <button
              onClick={() => setErrorNotification(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-red-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary view routers */}
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : activeTableId && activeTableState ? (
        <GameTable
          table={activeTableState}
          userId={user.id}
          user={user}
          onLeaveTable={handleLeaveTable}
          onLeaveSeat={handleLeaveSeat}
          onJoinSeat={handleJoinSeat}
          onPlaceBet={handlePlaceBet}
          onSendAction={handleSendAction}
          onSendMessage={handleSendMessage}
          onLogout={handleLogout}
        />
      ) : (
        <TableSelection
          tables={tablesList}
          user={user}
          onSelectTable={(id) => setActiveTableId(id)}
          onTopUp={handleTopUp}
          onLogout={handleLogout}
        />
      )}

      {/* Floating Administrator Trigger */}
      {user && user.username.toUpperCase() === "LUCAS" && (
        <button
          id="btn-admin-floating"
          onClick={() => {
            playSound("click");
            setIsAdminOpen(true);
          }}
          className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-slate-900/95 border border-red-500/30 hover:border-red-500/60 hover:bg-slate-800 text-red-400 hover:text-red-300 shadow-2xl flex items-center gap-2 group transition duration-150 cursor-pointer"
          title="Ouvrir le Panneau d'Administration"
        >
          <Shield className="w-5 h-5 animate-pulse group-hover:scale-110 transition duration-150" />
          <span className="text-xs font-bold font-mono pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300">ADMIN</span>
        </button>
      )}

      {/* Admin Panel Modal Overlay */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        apiFetch={apiFetch}
      />
    </div>
  );
}
