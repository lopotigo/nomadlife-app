import { useState } from "react";

export function HomeScreen() {
  const [input, setInput] = useState("");

  const nearbyNomads = [
    { name: "Sara K.", flag: "🇩🇪", skill: "Designer UX", online: true, avatar: "SK" },
    { name: "Luca M.", flag: "🇮🇹", skill: "Dev React", online: true, avatar: "LM" },
    { name: "Ana R.", flag: "🇧🇷", skill: "Marketing", online: false, avatar: "AR" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col font-sans" style={{ width: 390, maxWidth: 390 }}>
      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-4 pb-2 text-xs text-gray-400">
        <span>9:41</span>
        <div className="flex gap-1">
          <span>●●●</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 py-2 gap-4 overflow-y-auto pb-24">

        {/* AI greeting */}
        <div className="flex items-start gap-3 mt-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-sm font-bold shrink-0 shadow-lg shadow-teal-900/40">N</div>
          <div className="bg-[#1c1f2a] rounded-2xl rounded-tl-sm px-4 py-3 flex-1">
            <p className="text-white text-base font-medium leading-snug">
              Ciao Federico 👋
            </p>
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">
              Dove vai prossimamente? Ti organizzo tutto in un minuto.
            </p>
          </div>
        </div>

        {/* Three big action buttons */}
        <div className="flex flex-col gap-2.5 mt-1">
          <button className="w-full bg-[#1c1f2a] hover:bg-[#232637] border border-[#2e3347] rounded-2xl py-4 flex items-center gap-4 px-5 transition-all active:scale-[0.98]">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xl shadow-lg shadow-teal-900/40 shrink-0">
              📷
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Scatta una foto</p>
              <p className="text-gray-400 text-xs mt-0.5">Mostrami dove sei o dove vuoi andare</p>
            </div>
            <span className="ml-auto text-gray-600">›</span>
          </button>

          <button className="w-full bg-[#1c1f2a] hover:bg-[#232637] border border-[#2e3347] rounded-2xl py-4 flex items-center gap-4 px-5 transition-all active:scale-[0.98]">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-violet-900/40 shrink-0">
              🎤
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Dimmi dove vai</p>
              <p className="text-gray-400 text-xs mt-0.5">Parla e penso a tutto io</p>
            </div>
            <span className="ml-auto text-gray-600">›</span>
          </button>

          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Scrivi una destinazione…"
              className="w-full bg-[#1c1f2a] border border-[#2e3347] focus:border-teal-500 rounded-2xl py-4 pl-5 pr-14 text-white placeholder-gray-500 text-sm outline-none transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-base">
              ✈️
            </div>
          </div>
        </div>

        {/* Nomads nearby — expanded, with names */}
        <div className="bg-[#1c1f2a] border border-[#2e3347] rounded-2xl px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-white text-sm font-semibold">Nomadi vicino a te</p>
              <p className="text-gray-500 text-xs">Cagliari, Sardegna · adesso</p>
            </div>
            <span className="text-teal-400 text-xs font-medium">Tutti →</span>
          </div>

          <div className="flex flex-col gap-3">
            {nearbyNomads.map((n, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white">
                    {n.avatar}
                  </div>
                  {n.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-[#1c1f2a]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-medium">{n.name}</p>
                    <span className="text-xs">{n.flag}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{n.skill} · {n.online ? <span className="text-teal-400">online ora</span> : "visto oggi"}</p>
                </div>
                <button className="text-xs bg-[#252836] hover:bg-[#2e3347] text-gray-300 rounded-xl px-3 py-1.5 transition-colors">
                  Scrivi
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Viaggi", value: "3", icon: "✈️" },
            { label: "Connessioni", value: "12", icon: "🤝" },
            { label: "Paesi", value: "7", icon: "🌍" },
          ].map((s, i) => (
            <div key={i} className="bg-[#1c1f2a] border border-[#2e3347] rounded-xl py-3 flex flex-col items-center gap-1">
              <span className="text-lg">{s.icon}</span>
              <span className="text-white font-bold text-base">{s.value}</span>
              <span className="text-gray-500 text-xs">{s.label}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#1c1f2a] bg-[#0f1117]/95 backdrop-blur px-8 py-3 flex justify-around items-center" style={{ maxWidth: 390 }}>
        {[
          { icon: "🤖", label: "AI", active: true },
          { icon: "🗺️", label: "Mappa", active: false },
          { icon: "👥", label: "Community", active: false },
          { icon: "👤", label: "Profilo", active: false },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-lg">{item.icon}</span>
            <span className={`text-xs font-medium ${item.active ? "text-teal-400" : "text-gray-500"}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
