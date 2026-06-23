import React from "react";
import { Card, CardSuit } from "../types";

interface CardComponentProps {
  card: Card;
  index: number;
  key?: string | number;
}

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};

const SUIT_NAMES: Record<CardSuit, string> = {
  H: "Hearts",
  D: "Diamonds",
  C: "Clubs",
  S: "Spades",
};

export default function CardComponent({ card, index }: CardComponentProps) {
  const { suit, value, hidden } = card;
  const isRed = suit === "H" || suit === "D";
  const symbol = SUIT_SYMBOLS[suit];

  if (hidden) {
    return (
      <div
        id={`card-hidden-${index}`}
        className="relative w-16 h-24 sm:w-20 sm:h-30 rounded-lg border-2 border-amber-500 shadow-xl flex-shrink-0 cursor-default select-none bg-gradient-to-br from-red-800 to-red-950 p-1 overflow-hidden animate-fade-in-up"
        style={{ animationDelay: `${index * 150}ms` }}
      >
        <div className="w-full h-full rounded border border-amber-500/40 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/60 via-red-950 to-red-950">
          {/* Ornate back pattern */}
          <div className="w-10 h-16 sm:w-12 sm:h-20 border border-amber-600/30 rounded flex flex-wrap items-center justify-center p-1 opacity-60">
            <div className="text-amber-500 text-xs font-serif">♠♦♣♥</div>
            <div className="w-2 h-2 rounded-full border border-amber-500 bg-amber-900/40" />
            <div className="text-amber-500 text-xs font-serif">♥♣♦♠</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`card-${suit}-${value}-${index}`}
      className={`relative w-16 h-24 sm:w-20 sm:h-30 rounded-lg bg-white shadow-xl flex-shrink-0 cursor-default select-none flex flex-col justify-between p-1.5 sm:p-2 border border-gray-300 animate-fade-in-up ${
        isRed ? "text-red-600" : "text-gray-900"
      }`}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* Top Left Indicator */}
      <div className="flex flex-col items-center leading-none">
        <span className="text-sm sm:text-base font-bold font-sans">{value}</span>
        <span className="text-xs sm:text-sm -mt-0.5">{symbol}</span>
      </div>

      {/* Center Art */}
      <div className="flex justify-center items-center h-full">
        {["J", "Q", "K"].includes(value) ? (
          <div className="text-xl sm:text-3xl font-serif opacity-90 relative">
            {value === "J" && "🤵"}
            {value === "Q" && "👸"}
            {value === "K" && "👑"}
            <span className="absolute -bottom-1 -right-1 text-xs opacity-40">{symbol}</span>
          </div>
        ) : (
          <span className="text-xl sm:text-3xl font-bold">{symbol}</span>
        )}
      </div>

      {/* Bottom Right Indicator */}
      <div className="flex flex-col items-center leading-none rotate-180">
        <span className="text-sm sm:text-base font-bold font-sans">{value}</span>
        <span className="text-xs sm:text-sm -mt-0.5">{symbol}</span>
      </div>
    </div>
  );
}
