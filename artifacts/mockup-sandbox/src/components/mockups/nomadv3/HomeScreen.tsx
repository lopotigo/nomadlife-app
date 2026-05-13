import { useState } from "react";

export function HomeScreen() {
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans" style={{ width: 390, maxWidth: 390 }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-4 pb-2 text-xs text-gray-400">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* Top section — greeting */}
      <div className="flex-1 flex flex-col justify-between px-6 py-4">
        <div className="flex flex-col gap-2 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold">N</div>
            <span className="text-gray-400 text-sm">NomadBot</span>
          </div>
          <div className="mt-3 bg-[#1c1f2a] rounded-2xl rounded-tl-sm px-5 py-4">
            <p className="text-white text-lg font-medium leading-snug">
              Ciao Federico 👋<br />
              <span className="text-gray-300 font-normal">Dove vai prossimamente?</span>
            </p>
          </div>
        </div>

        {/* Three big action buttons */}
        <div className="flex flex-col gap-3 mt-8">
          <p className="text-gray-500 text-xs uppercase tracking-widest text-center mb-1">Rispondi con</p>

          <button className="w-full bg-[#1c1f2a] hover:bg-[#252836] border border-[#2e3347] rounded-2xl py-5 flex items-center gap-4 px-6 transition-all active:scale-95">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-2xl shadow-lg">
              📷
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-base">Scatta una foto</p>
              <p className="text-gray-400 text-sm">Mostrami dove sei o dove vuoi andare</p>
            </div>
          </button>

          <button className="w-full bg-[#1c1f2a] hover:bg-[#252836] border border-[#2e3347] rounded-2xl py-5 flex items-center gap-4 px-6 transition-all active:scale-95">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg">
              🎤
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-base">Dimmi dove vai</p>
              <p className="text-gray-400 text-sm">Parla e penso a tutto io</p>
            </div>
          </button>

          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
              placeholder="Scrivi una destinazione…"
              className="w-full bg-[#1c1f2a] border border-[#2e3347] rounded-2xl py-5 pl-6 pr-14 text-white placeholder-gray-500 text-base outline-none focus:border-teal-500 transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center text-lg">
              ✏️
            </div>
          </div>
        </div>

        {/* Nearby nomads teaser */}
        <div className="mt-6 mb-4">
          <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["🧑‍💻","👩‍🎨","🧑‍🚀"].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-[#252836] border-2 border-[#0f1117] flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <div>
                <p className="text-white text-sm font-medium">3 nomadi vicino a te</p>
                <p className="text-gray-400 text-xs">Cagliari, Sardegna</p>
              </div>
            </div>
            <span className="text-teal-400 text-sm font-medium">Vedi →</span>
          </div>
        </div>
      </div>

      {/* Bottom nav — minimal, only 3 icons */}
      <div className="border-t border-[#1c1f2a] px-8 py-4 flex justify-around items-center">
        <button className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 text-teal-400">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
          <span className="text-teal-400 text-xs font-medium">Esplora</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </div>
          <span className="text-gray-500 text-xs">Community</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </div>
          <span className="text-gray-500 text-xs">Chat</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-6 h-6 text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M12 14c-5 0-8 2.5-8 4v1h16v-1c0-1.5-3-4-8-4z"/></svg>
          </div>
          <span className="text-gray-500 text-xs">Profilo</span>
        </button>
      </div>
    </div>
  );
}
