import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { Send } from "lucide-react";
import { playSound } from "./AudioController";

interface ChatBoxProps {
  messages: ChatMessage[];
  userId: string;
  onSendMessage: (text: string) => void;
}

export default function ChatBox({ messages, userId, onSendMessage }: ChatBoxProps) {
  const [text, setText] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
    playSound("click");
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div id="chat-container" className="flex flex-col h-64 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-xl">
      {/* Chat Header */}
      <div className="px-3.5 py-2 border-b border-white/5 bg-white/10 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 font-sans tracking-wide uppercase">Tchat de la Table</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono">
          En ligne
        </span>
      </div>

      {/* Messages list */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
        {messages.map((msg) => {
          const isMe = msg.userId === userId;
          const isSystem = msg.userId === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center py-1 text-slate-500 italic font-sans text-[11px] leading-relaxed">
                📢 {msg.text}
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <span className={`text-[10px] mb-0.5 font-medium ${isMe ? "text-emerald-400" : "text-slate-400"}`}>
                {msg.username}
              </span>
              <div
                className={`px-3 py-1.5 rounded-lg leading-relaxed break-words ${
                  isMe
                    ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 rounded-tr-none"
                    : "bg-white/10 text-slate-200 border border-white/10 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-white/5 bg-white/5 flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Envoyer un message..."
          maxLength={100}
          className="flex-1 bg-white/5 text-slate-200 rounded-lg px-3 py-1.5 border border-white/10 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder-slate-500 font-sans"
        />
        <button
          type="submit"
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold p-1.5 rounded-lg transition duration-200 shadow-md active:scale-95 cursor-pointer flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
