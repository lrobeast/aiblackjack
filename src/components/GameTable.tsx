import React, { useState, useEffect, useRef } from "react";
import { TableState, UserProfile, PlayerSeat, Card } from "../types";
import { playSound } from "./AudioController";
import CardComponent from "./CardComponent";
import ChatBox from "./ChatBox";
import { ArrowLeft, Coins, Clock, Volume2, VolumeX, MessageSquare, ClipboardList, RefreshCw, UserPlus, LogOut, UserMinus, Home } from "lucide-react";

interface GameTableProps {
  table: TableState;
  userId: string;
  user: UserProfile;
  onLeaveTable: () => void;
  onLeaveSeat: () => void;
  onJoinSeat: (seatIndex: number) => void;
  onPlaceBet: (amount: number) => void;
  onSendAction: (action: "hit" | "stand" | "double") => void;
  onSendMessage: (text: string) => void;
  onLogout: () => void;
}

export default function GameTable({
  table,
  userId,
  user,
  onLeaveTable,
  onLeaveSeat,
  onJoinSeat,
  onPlaceBet,
  onSendAction,
  onSendMessage,
  onLogout,
}: GameTableProps) {
  const [betAmount, setBetAmount] = useState<number>(table?.minBet || 10);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showLogs, setShowLogs] = useState<boolean>(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Find user's seat if any
  const mySeat = table?.seats ? table.seats.find((s) => s.userId === userId) : undefined;
  const isMyTurn = table?.activeSeatIndex !== null && table?.activeSeatIndex !== undefined && table?.seats && table.seats[table.activeSeatIndex]?.userId === userId;

  // Track cards to trigger sound effects
  const prevDealerCardsCount = useRef<number>(0);
  const prevPlayerCardsCount = useRef<Record<number, number>>({});
  const prevTableStatus = useRef<string>("");

  useEffect(() => {
    if (!soundEnabled) return;

    // 1. Dealer card dealt sound
    if (table?.dealerHand && table.dealerHand.length > prevDealerCardsCount.current) {
      playSound("card");
    }
    prevDealerCardsCount.current = table?.dealerHand?.length || 0;

    // 2. Player card dealt sound
    if (table?.seats) {
      table.seats.forEach((seat, idx) => {
        const prevCount = prevPlayerCardsCount.current[idx] || 0;
        if (seat.hand && seat.hand.length > prevCount) {
          playSound("card");
        }
        prevPlayerCardsCount.current[idx] = seat.hand?.length || 0;
      });
    }

    // 3. Round payout sounds (transitions to round-over)
    if (table?.status === "round-over" && prevTableStatus.current !== "round-over") {
      if (mySeat && mySeat.bet > 0) {
        if (mySeat.payout > 0) {
          playSound("win");
        } else if (mySeat.payout < 0) {
          playSound("lose");
        }
      }
    }
    prevTableStatus.current = table?.status || "";
  }, [table, soundEnabled, mySeat]);

  // Scroll game logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [table.gameLogs]);

  const handleChipClick = (val: number) => {
    if (table.status !== "betting") return;
    const newBet = Math.min(table.maxBet, Math.max(table.minBet, (mySeat?.bet || 0) + val));
    if (newBet > user.balance + (mySeat?.bet || 0)) return;

    playSound("chip");
    onPlaceBet(newBet);
  };

  const handleClearBet = () => {
    if (table.status !== "betting") return;
    playSound("click");
    onPlaceBet(0);
  };

  const calculateHandScore = (hand: Card[]): number => {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.hidden) continue;
      if (card.value === "A") {
        aces += 1;
        total += 11;
      } else if (["K", "Q", "J"].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value, 10);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  };

  // Dynamic chip values based on table limits
  const chips = (() => {
    const maxB = table?.maxBet || 200;
    if (maxB === 200) {
      return [10, 25, 50, 100, 200];
    }
    if (maxB === 1000) {
      return [50, 100, 250, 500, 1000];
    }
    if (maxB === 5000) {
      return [200, 500, 1000, 2500, 5000];
    }
    return [5, 10, 25, 100, 500];
  })();

  return (
    <div id="game-table-container" className="relative min-h-screen bg-[#020617] text-slate-100 py-4 sm:py-6 px-2 lg:px-4 overflow-hidden font-sans">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Top Navbar */}
        <div className="flex justify-between items-center bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl mb-4 gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playSound("click");
                onLeaveTable();
              }}
              className="flex items-center gap-2 text-xs font-bold text-red-300 hover:text-white transition duration-150 py-1.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 hover:border-red-500/40 cursor-pointer shadow-md"
              title="Quitter cette table pour revenir à l'accueil du choix des tables"
            >
              <Home className="w-3.5 h-3.5 text-red-400" />
              Quitter la Table (Accueil)
            </button>

            <button
              onClick={() => {
                playSound("click");
                onLogout();
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition duration-150 py-1.5 px-3 rounded-lg bg-slate-950/40 hover:bg-slate-900/60 border border-slate-500/20 hover:border-slate-500/40 cursor-pointer shadow-md"
              title="Se déconnecter et revenir à l'écran de connexion"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              Se Déconnecter
            </button>

            {mySeat && (
              <button
                onClick={() => {
                  playSound("click");
                  onLeaveSeat();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 transition duration-150 py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer"
              >
                <UserMinus className="w-3.5 h-3.5 text-amber-400" />
                Se Lever (Libérer Siège)
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-extrabold text-slate-200 hidden md:inline uppercase tracking-wider">
              {table.name}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 py-0.5 bg-white/5 border border-white/10 rounded font-mono">
              Limites: ${table.minBet}-${table.maxBet}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 cursor-pointer"
              title={soundEnabled ? "Couper le son" : "Activer le son"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* User Account info */}
            <div className="bg-white/10 border border-white/10 rounded-xl px-3 py-1 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase leading-none">Solde</span>
                <span className="text-sm font-bold text-emerald-400 font-mono leading-tight">${user.balance}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Interface Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Area - Blackjack Felt Table */}
          <div className="lg:col-span-3 flex flex-col justify-between bg-gradient-to-b from-emerald-950/45 via-indigo-950/20 to-[#020617] backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-4 sm:p-6 min-h-[500px] sm:min-h-[600px] relative overflow-hidden">
            {/* Inner felt visual rings */}
            <div className="absolute inset-0 border-8 border-emerald-500/5 rounded-[22px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] border-2 border-dashed border-emerald-500/10 rounded-full pointer-events-none" />

            {/* Golden table inscription */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center select-none pointer-events-none">
              <h4 className="text-emerald-400/20 font-sans font-bold text-sm tracking-widest leading-none sm:text-base uppercase">
                Le Blackjack paye 3 pour 2
              </h4>
              <p className="text-emerald-400/15 font-sans font-semibold text-[10px] mt-1.5 uppercase tracking-wider">
                Le croupier tire jusqu'à 16 et s'arrête sur tous les 17
              </p>
            </div>

            {/* 1. Dealer Section */}
            <div id="dealer-section" className="flex flex-col items-center z-10">
              <div className="bg-white/5 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 mb-3 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-300 tracking-wide uppercase">Croupier</span>
                {table.dealerHand.length > 0 && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.2 rounded-full font-mono">
                    {calculateHandScore(table.dealerHand)}
                  </span>
                )}
              </div>

              {/* Dealer Cards */}
              <div className="flex gap-2 min-h-[96px] sm:min-h-[120px] justify-center items-center">
                {table.dealerHand.length === 0 ? (
                  <div className="text-slate-500 text-xs italic py-4">En attente de distribution...</div>
                ) : (
                  table.dealerHand.map((card, idx) => (
                    <CardComponent key={`dealer-${idx}`} card={card} index={idx} />
                  ))
                )}
              </div>
            </div>

            {/* 2. Central Table Status Banner */}
            <div id="table-status-banner" className="flex flex-col items-center justify-center py-4 my-2 z-10">
              {table.status === "betting" && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-5 py-2.5 rounded-2xl shadow-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    Mises Ouvertes ({table.countdown}s)
                  </span>
                  <p className="text-xs text-slate-300">Placez vos jetons sur votre siège pour participer au tour</p>
                </div>
              )}

              {table.status === "dealing" && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-6 py-2 rounded-xl shadow-xl">
                  <span className="text-xs font-bold text-slate-200 animate-pulse uppercase tracking-widest">
                    Distribution des cartes...
                  </span>
                </div>
              )}

              {table.status === "player-turns" && table.activeSeatIndex !== null && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-5 py-2 rounded-2xl shadow-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Tour de {table.seats[table.activeSeatIndex]?.username} ({table.countdown}s)
                  </span>
                </div>
              )}

              {table.status === "dealer-turn" && (
                <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-6 py-2 rounded-xl shadow-xl">
                  <span className="text-xs font-bold text-emerald-400 animate-pulse uppercase tracking-widest">
                    Tour du Croupier...
                  </span>
                </div>
              )}

              {table.status === "round-over" && (
                <div className="bg-white/10 border border-emerald-500/30 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl text-center max-w-sm">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wide">
                    Tour Terminé
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 font-semibold">Distribution des gains aux joueurs !</p>
                  <div className="text-[10px] text-slate-500 font-mono mt-2">
                    Prochain tour dans <span className="text-emerald-400 font-bold">{table.countdown}s</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Seating Arc */}
            <div id="seating-arc" className="grid grid-cols-5 gap-2 items-end pt-4 z-10">
              {table.seats.map((seat, idx) => {
                const isOccupied = seat.userId !== null;
                const isMeInSeat = seat.userId === userId;
                const isActiveSeat = table.activeSeatIndex === idx;

                return (
                  <div
                    key={`seat-${idx}`}
                    className={`flex flex-col items-center p-2 rounded-xl transition duration-300 ${
                      isActiveSeat
                        ? "bg-white/15 ring-2 ring-emerald-400 shadow-lg"
                        : isMeInSeat
                        ? "bg-white/5 border border-emerald-500/20"
                        : "bg-white/5 border border-white/5"
                    }`}
                  >
                    {/* Seat Cards stack */}
                    <div className="flex -space-x-10 min-h-[80px] justify-center items-center mb-3">
                      {seat.hand.map((card, cidx) => (
                        <div key={`card-${idx}-${cidx}`} className="transform scale-[0.8] origin-bottom hover:scale-95 transition-transform duration-200">
                          <CardComponent card={card} index={cidx} />
                        </div>
                      ))}
                    </div>

                    {/* Seat Label Frame */}
                    {isOccupied ? (
                      <div className="w-full text-center">
                        <div className="text-[10px] font-bold text-slate-100 truncate max-w-[80px] mx-auto">
                          {seat.username}
                        </div>

                        {seat.bet > 0 && (
                          <div className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] font-bold">
                            ${seat.bet}
                          </div>
                        )}

                        {/* Seat Hand Total Indicator */}
                        {seat.hand.length > 0 && (
                          <div className="text-[9px] mt-1 font-mono font-bold text-slate-400">
                            Total: {calculateHandScore(seat.hand)}
                          </div>
                        )}

                        {/* Status Message Overlay */}
                        {seat.message && (
                          <div
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 truncate ${
                              seat.message.includes("+")
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : seat.message.includes("Bust")
                                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                : "bg-white/10 text-slate-300 border border-white/10"
                            }`}
                          >
                            {seat.message}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          playSound("click");
                          onJoinSeat(idx);
                        }}
                        disabled={mySeat !== undefined}
                        className={`w-full py-2.5 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition duration-200 ${
                          mySeat !== undefined
                            ? "border-white/5 text-slate-600 cursor-not-allowed"
                            : "border-emerald-500/20 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/5 cursor-pointer"
                        }`}
                      >
                        <UserPlus className="w-4 h-4" />
                        <span className="text-[8px] font-bold uppercase tracking-wider">S'asseoir</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4. Betting / Action overlay at the bottom of the table */}
            <div id="table-controls" className="mt-6 border-t border-white/5 pt-4 z-10">
              {/* If seated and betting is active */}
              {mySeat && table.status === "betting" && (
                <div className="flex flex-col items-center space-y-3.5 bg-white/5 border border-white/10 backdrop-blur-xl p-4 rounded-2xl shadow-xl max-w-xl mx-auto">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Configurez votre mise : <span className="text-emerald-400">${mySeat.bet}</span>
                  </span>

                  {/* Golden Chips selector */}
                  <div className="flex items-center gap-3 py-1">
                    {chips.map((chipVal) => (
                      <button
                        key={`chip-${chipVal}`}
                        disabled={chipVal > user.balance}
                        onClick={() => handleChipClick(chipVal)}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border-4 border-dashed flex items-center justify-center font-bold font-mono text-xs shadow-md transform hover:-translate-y-1 transition duration-150 active:scale-90 cursor-pointer ${
                          chipVal === 5 ? "bg-red-600 text-white border-red-300" :
                          chipVal === 10 ? "bg-blue-600 text-white border-blue-300" :
                          chipVal === 25 ? "bg-green-700 text-white border-green-300" :
                          chipVal === 50 ? "bg-purple-700 text-white border-purple-300" :
                          chipVal === 100 ? "bg-slate-800 text-emerald-400 border-slate-600" :
                          chipVal === 200 ? "bg-emerald-600 text-white border-emerald-300" :
                          chipVal === 250 ? "bg-amber-700 text-white border-amber-400" :
                          chipVal === 500 ? "bg-amber-500 text-slate-950 border-amber-300" :
                          "bg-rose-700 text-white border-rose-300"
                        } ${chipVal > user.balance ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        ${chipVal}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={handleClearBet}
                      disabled={mySeat.bet === 0}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition duration-150 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Effacer
                    </button>

                    <button
                      onClick={() => {
                        playSound("click");
                        onLeaveSeat();
                      }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold border border-red-500/20 hover:border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 transition duration-150 active:scale-95 cursor-pointer shadow-md"
                    >
                      Se lever
                    </button>

                    <button
                      onClick={() => {
                        if (mySeat.bet < table.minBet) return;
                        playSound("chip");
                        onPlaceBet(mySeat.bet);
                      }}
                      disabled={mySeat.bet < table.minBet}
                      className={`flex-2 py-2 rounded-xl text-xs font-bold text-slate-950 shadow-md transition duration-150 active:scale-95 ${
                        mySeat.bet < table.minBet
                          ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                          : "bg-emerald-500 hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
                      }`}
                    >
                      Mise validée (${mySeat.bet})
                    </button>
                  </div>
                </div>
              )}

              {/* If seated and active player turn */}
              {mySeat && isMyTurn && table.status === "player-turns" && (
                <div className="flex flex-col items-center bg-white/5 border border-emerald-500/30 backdrop-blur-xl p-4 rounded-2xl shadow-2xl max-w-lg mx-auto animate-pulse">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3.5">
                    À VOTRE TOUR ! Quelle est votre décision ?
                  </span>

                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        playSound("click");
                        onSendAction("hit");
                      }}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition duration-150 active:scale-95 cursor-pointer"
                    >
                      Tirer (Hit)
                    </button>

                    <button
                      onClick={() => {
                        playSound("click");
                        onSendAction("stand");
                      }}
                      className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl shadow-lg transition duration-150 active:scale-95 cursor-pointer border border-white/10"
                    >
                      Rester (Stand)
                    </button>

                    <button
                      onClick={() => {
                        playSound("click");
                        onSendAction("double");
                      }}
                      disabled={user.balance < mySeat.bet}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition duration-150 active:scale-95 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Doubler (Double)
                    </button>
                  </div>
                </div>
              )}

              {/* If waiting for seat */}
              {!mySeat && (
                <div className="text-center py-2 text-slate-400 text-xs italic">
                  Sélectionnez un siège pour commencer à miser et jouer !
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Info panel, Logs & Chat */}
          <div className="flex flex-col gap-4">
            {/* Table Logs */}
            <div id="logs-container" className="flex flex-col h-48 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="px-3 py-1.5 border-b border-white/5 bg-white/10 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-300 tracking-wide uppercase">Croupier Journal</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
                {table.gameLogs.map((log, idx) => (
                  <div key={`log-${idx}`} className="text-[10px] text-slate-400 leading-relaxed font-mono">
                    <span className="text-emerald-500 select-none mr-1">&gt;</span>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Chat Box */}
            <ChatBox messages={table.chatMessages} userId={userId} onSendMessage={onSendMessage} />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div id="bottom-navigation-bar" className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
          <div className="text-center sm:text-left">
            <span className="text-xs text-slate-400 font-medium font-mono">Options de sortie</span>
            <p className="text-[10px] text-slate-500 mt-0.5">Quittez la table ou fermez votre session en toute sécurité</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-3">
            <button
              id="btn-leave-table-bottom"
              onClick={() => {
                playSound("click");
                onLeaveTable();
              }}
              className="flex items-center gap-2 text-xs font-bold text-red-300 hover:text-white transition duration-150 py-2 px-4 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 hover:border-red-500/40 cursor-pointer shadow-md"
              title="Quitter cette table pour revenir à l'accueil du choix des tables"
            >
              <Home className="w-4 h-4 text-red-400" />
              Quitter la Table (Accueil)
            </button>

            <button
              id="btn-logout-bottom"
              onClick={() => {
                playSound("click");
                onLogout();
              }}
              className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition duration-150 py-2 px-4 rounded-xl bg-slate-950/40 hover:bg-slate-900/60 border border-slate-500/20 hover:border-slate-500/40 cursor-pointer shadow-md"
              title="Se déconnecter et revenir à l'écran de connexion"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              Se Déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
